"use strict";
/**
 * CreateDataElement Handler - ABAP Data Element Creation via ADT API
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: create -> activate -> verify
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateDataElement = handleCreateDataElement;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const transportConflict_1 = require("../../../lib/transportConflict");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateDataElement',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: DataElement. Will be useful for creating data element. Create a new ABAP data element in SAP system. Creates the data element object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            data_element_name: {
                type: 'string',
                description: 'Data element name (e.g., ZZ_E_TEST_001). Must follow SAP naming conventions.',
            },
            description: {
                type: 'string',
                description: 'Data element description. If not provided, data_element_name will be used.',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            data_type: {
                type: 'string',
                description: "Data type (e.g., CHAR, NUMC) or domain name when type_kind is 'domain'.",
                default: 'CHAR',
            },
            length: {
                type: 'number',
                description: 'Data type length. Usually inherited from domain.',
                default: 100,
            },
            decimals: {
                type: 'number',
                description: 'Decimal places. Usually inherited from domain.',
                default: 0,
            },
            short_label: {
                type: 'string',
                description: 'Short field label (max 10 chars). Applied during update step after creation.',
            },
            medium_label: {
                type: 'string',
                description: 'Medium field label (max 20 chars). Applied during update step after creation.',
            },
            long_label: {
                type: 'string',
                description: 'Long field label (max 40 chars). Applied during update step after creation.',
            },
            heading_label: {
                type: 'string',
                description: 'Heading field label (max 55 chars). Applied during update step after creation.',
            },
            type_kind: {
                type: 'string',
                description: "Type kind: 'domain' (default), 'predefinedAbapType', 'refToPredefinedAbapType', 'refToDictionaryType', 'refToClifType'. If not specified, defaults to 'domain'.",
                enum: [
                    'domain',
                    'predefinedAbapType',
                    'refToPredefinedAbapType',
                    'refToDictionaryType',
                    'refToClifType',
                ],
                default: 'domain',
            },
            type_name: {
                type: 'string',
                description: "Type name: domain name (when type_kind is 'domain'), data element name (when type_kind is 'refToDictionaryType'), or class name (when type_kind is 'refToClifType')",
            },
            search_help: {
                type: 'string',
                description: 'Search help name. Applied during update step after creation.',
            },
            search_help_parameter: {
                type: 'string',
                description: 'Search help parameter. Applied during update step after creation.',
            },
            set_get_parameter: {
                type: 'string',
                description: 'Set/Get parameter ID. Applied during update step after creation.',
            },
        },
        required: ['data_element_name', 'package_name'],
    },
};
/**
 * Main handler for CreateDataElement MCP tool
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleCreateDataElement(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.data_element_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Data element name is required');
        }
        if (!args?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        // Validate transport_request: required for non-$TMP packages
        (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        const typedArgs = args;
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        const dataElementName = typedArgs.data_element_name.toUpperCase();
        (0, utils_1.assertNameLength)('data_element', dataElementName, 'Data element');
        logger?.info(`Starting data element creation: ${dataElementName}`);
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = typedArgs.activate !== false;
        const typeKind = typedArgs.type_kind || 'domain';
        let lockHandle;
        let createdUri;
        // What the write ACTUALLY went into — not what the caller passed. Reporting
        // the caller's own input while SAP wrote somewhere else is the echo defect.
        let transportUsed = typedArgs.transport_request;
        const warnings = [];
        try {
            // Validate — fail fast BEFORE create/lock if the name is taken.
            await (0, utils_1.assertObjectDoesNotExist)(`Data element ${dataElementName}`, () => client.getDataElement().validate({
                dataElementName,
                packageName: typedArgs.package_name,
                description: typedArgs.description || dataElementName,
            }), connection);
            // Create (registers bare object in SAP)
            await client.getDataElement().create({
                dataElementName,
                description: typedArgs.description || dataElementName,
                packageName: typedArgs.package_name,
                typeKind: typeKind,
                dataType: typedArgs.data_type,
                typeName: typedArgs.type_name,
                length: typedArgs.length,
                decimals: typedArgs.decimals,
                transportRequest: typedArgs.transport_request,
            });
            createdUri = (0, adtObjectOps_1.buildActivationUri)(dataElementName, 'DTEL');
            // Lock
            lockHandle = await client.getDataElement().lock({ dataElementName });
            // Update with read-modify-write: reads current XML from SAP, patches with properties, PUTs back.
            //
            // Wrapped because leg 1 above may have landed in a DIFFERENT request than
            // the caller passed: SAP resolves the object's transport assignment for the
            // package, so passing a TASK gets the object locked in its PARENT request
            // and this PUT is then refused with ExceptionResourceLockConflict — leaving
            // the object created, inactive and label-less. The refusal names the winning
            // request, so the write follows SAP rather than failing. See transportConflict.
            const write = await (0, transportConflict_1.runUnderResolvedTransport)((transportRequest) => client.getDataElement().update({
                dataElementName,
                packageName: typedArgs.package_name,
                description: typedArgs.description || dataElementName,
                dataType: typedArgs.data_type || 'CHAR',
                length: typedArgs.length || 100,
                decimals: typedArgs.decimals || 0,
                shortLabel: typedArgs.short_label,
                mediumLabel: typedArgs.medium_label,
                longLabel: typedArgs.long_label,
                headingLabel: typedArgs.heading_label,
                typeKind: typeKind,
                typeName: typedArgs.type_name,
                searchHelp: typedArgs.search_help,
                searchHelpParameter: typedArgs.search_help_parameter,
                setGetParameter: typedArgs.set_get_parameter,
                transportRequest,
            }, { lockHandle }), typedArgs.transport_request, `Data element ${dataElementName}`, logger);
            transportUsed = write.transport_used;
            if (write.warning)
                warnings.push(write.warning);
            // Unlock
            await client.getDataElement().unlock({ dataElementName }, lockHandle);
            lockHandle = undefined;
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getDataElement()
                    .read({ dataElementName }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            // Check
            try {
                await (0, utils_1.safeCheckOperation)(() => client.getDataElement().check({ dataElementName }), dataElementName, {
                    debug: (message) => logger?.debug(message),
                });
            }
            catch (checkError) {
                if (!checkError.isAlreadyChecked) {
                    throw checkError;
                }
            }
            let activation;
            // Activate if requested — and report SAP's verdict, not the request flag.
            activation = shouldActivate
                ? await (0, adtObjectOps_1.activateWrittenObject)(connection, dataElementName, 'DTEL', `Data element ${dataElementName}`, 'created')
                : undefined;
            logger?.info(`✅ CreateDataElement completed: ${dataElementName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    data_element_name: dataElementName,
                    package: typedArgs.package_name,
                    transport_request: transportUsed,
                    ...(transportUsed !== typedArgs.transport_request
                        ? { transport_request_requested: typedArgs.transport_request }
                        : {}),
                    ...(warnings.length ? { warnings } : {}),
                    data_type: typedArgs.data_type || null,
                    ...(0, adtObjectOps_1.writtenActivationFields)(activation),
                    message: activation
                        ? (0, adtMessages_1.describeActivation)(activation, `Data element ${dataElementName}`)
                        : `Data element ${dataElementName} created successfully`,
                }, null, 2),
            });
        }
        catch (error) {
            if (lockHandle) {
                try {
                    await client.getDataElement().unlock({ dataElementName }, lockHandle);
                }
                catch (_unlockError) {
                    // Ignore unlock errors during cleanup
                }
            }
            logger?.error(`Error creating data element ${dataElementName}: ${error?.message || error}`);
            if (error.message?.includes('already exists') ||
                error.response?.data?.includes('ExceptionResourceAlreadyExists')) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Data element ${dataElementName} already exists. Please delete it first or use a different name.`);
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : String(error.response.data).substring(0, 500)
                : error.message || String(error);
            // field report round 6, F-4. The object was registered in SAP before this failed,
            // and until now it stayed there: an inactive shell that nothing reports
            // and that blocks later activations in its package. Only PRE-ACTIVATION
            // failures are cleaned up here — a failure to ACTIVATE leaves a usable
            // object on purpose, and `activateWrittenObject` already names it and
            // says what to do with it.
            // A lock conflict leaves a USABLE object — created, inactive, but intact —
            // that cleanup cannot delete anyway (it is locked in another request). Tell
            // the caller how to finish it instead of telling them to delete it: the
            // reporting project ignored the old "delete it before retrying" advice and
            // recovered all four objects on the first try with UpdateDataElement under
            // the request named in the lock message.
            const conflicting = (0, transportConflict_1.extractConflictingRequest)(error, typedArgs.transport_request);
            const cleanup = createdUri
                ? await (0, adtDeletion_1.removePartialCreation)(connection, {
                    objectUri: createdUri,
                    objectLabel: `data element ${dataElementName}`,
                    transportRequest: typedArgs.transport_request,
                    retryHint: conflicting
                        ? (0, transportConflict_1.describeTransportRecovery)('UpdateDataElement', conflicting)
                        : undefined,
                    logger,
                })
                : '';
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to create data element ${dataElementName}: ${errorMessage}${cleanup}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateDataElement.js.map