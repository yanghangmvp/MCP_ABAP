"use strict";
/**
 * UpdateDataElement Handler - Update Existing ABAP Data Element
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateDataElement = handleUpdateDataElement;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'UpdateDataElement',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: DataElement. Will be useful for updating or creating data element. Update an existing ABAP data element. Locks, updates with provided parameters (complete replacement), unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            data_element_name: {
                type: 'string',
                description: 'Data element name to update (e.g., ZZ_TEST_DTEL_01)',
            },
            description: {
                type: 'string',
                description: 'New data element description',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            type_kind: {
                type: 'string',
                description: 'Type kind: domain, predefinedAbapType, refToPredefinedAbapType, refToDictionaryType, refToClifType',
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
                description: 'Type name: domain name, data element name, or class name (depending on type_kind)',
            },
            data_type: {
                type: 'string',
                description: 'Data type (CHAR, NUMC, etc.) - for predefinedAbapType or refToPredefinedAbapType',
            },
            length: {
                type: 'number',
                description: 'Length - for predefinedAbapType or refToPredefinedAbapType',
            },
            decimals: {
                type: 'number',
                description: 'Decimals - for predefinedAbapType or refToPredefinedAbapType',
            },
            field_label_short: {
                type: 'string',
                description: 'Short field label (max 10 chars)',
            },
            field_label_medium: {
                type: 'string',
                description: 'Medium field label (max 20 chars)',
            },
            field_label_long: {
                type: 'string',
                description: 'Long field label (max 40 chars)',
            },
            field_label_heading: {
                type: 'string',
                description: 'Heading field label (max 55 chars)',
            },
            search_help: {
                type: 'string',
                description: 'Search help name',
            },
            search_help_parameter: {
                type: 'string',
                description: 'Search help parameter',
            },
            set_get_parameter: {
                type: 'string',
                description: 'Set/Get parameter ID',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
                default: true,
            },
        },
        required: ['data_element_name', 'package_name'],
    },
};
/**
 * Main handler for UpdateDataElement tool
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleUpdateDataElement(context, args) {
    const { connection, logger } = context;
    try {
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
        logger?.info(`Starting data element update: ${dataElementName}`);
        try {
            const rawTypeKind = (typedArgs.type_kind || 'domain')
                .toString()
                .toLowerCase();
            const typeKindMap = {
                domain: 'domain',
                builtin: 'predefinedAbapType',
                predefinedabaptype: 'predefinedAbapType',
                reftopredefinedabaptype: 'refToPredefinedAbapType',
                reftodictionarytype: 'refToDictionaryType',
                reftocliftype: 'refToClifType',
            };
            const typeKind = typeKindMap[rawTypeKind] || 'domain';
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            const shouldActivate = typedArgs.activate !== false; // Default to true if not specified
            // Validate (for update, "already exists" is expected - object must exist)
            let updateState;
            try {
                await client.getDataElement().validate({
                    dataElementName,
                    packageName: typedArgs.package_name,
                    description: typedArgs.description || dataElementName,
                });
            }
            catch (validateError) {
                // For update operations, "already exists" is expected - object must exist
                if (!(0, utils_1.isAlreadyExistsError)(validateError)) {
                    // Real validation error - rethrow
                    throw validateError;
                }
                // "Already exists" is OK for update - continue
                logger?.info(`Data element ${dataElementName} already exists - this is expected for update operation`);
            }
            // Lock
            let lockHandle;
            try {
                lockHandle = await client
                    .getDataElement()
                    .lock({ dataElementName: dataElementName });
                // Update with properties
                const properties = {
                    dataType: typedArgs.data_type,
                    length: typedArgs.length,
                    decimals: typedArgs.decimals,
                    shortLabel: typedArgs.field_label_short,
                    mediumLabel: typedArgs.field_label_medium,
                    longLabel: typedArgs.field_label_long,
                    headingLabel: typedArgs.field_label_heading,
                    typeKind: typeKind,
                    typeName: typedArgs.type_name?.toUpperCase(),
                    searchHelp: typedArgs.search_help,
                    searchHelpParameter: typedArgs.search_help_parameter,
                    setGetParameter: typedArgs.set_get_parameter,
                };
                updateState = await client.getDataElement().update({
                    dataElementName,
                    packageName: typedArgs.package_name,
                    transportRequest: typedArgs.transport_request,
                    description: typedArgs.description || dataElementName,
                    ...properties,
                }, { lockHandle });
                // Check
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getDataElement().check({ dataElementName }), dataElementName, {
                        debug: (message) => logger?.debug(message),
                    });
                }
                catch (checkError) {
                    // If error was marked as "already checked", continue silently
                    if (!checkError.isAlreadyChecked) {
                        // Real check error - rethrow
                        throw checkError;
                    }
                }
            }
            finally {
                if (lockHandle) {
                    try {
                        await client
                            .getDataElement()
                            .unlock({ dataElementName }, lockHandle);
                        logger?.info(`Data element unlocked: ${dataElementName}`);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock data element ${dataElementName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getDataElement()
                    .read({ dataElementName }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            let activation;
            // Activate if requested — and report SAP's verdict, not the request flag.
            activation = shouldActivate
                ? await (0, adtObjectOps_1.activateWrittenObject)(connection, dataElementName, 'DTEL', `Data element ${dataElementName}`, 'updated')
                : undefined;
            // Get data element details from update result
            const updateResult = updateState?.updateResult;
            let dataElementDetails = null;
            if (updateResult?.data &&
                typeof updateResult.data === 'object' &&
                'data_element_details' in updateResult.data) {
                dataElementDetails = updateResult.data.data_element_details;
            }
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    data_element_name: dataElementName,
                    package: typedArgs.package_name,
                    transport_request: typedArgs.transport_request,
                    data_type: typedArgs.data_type || null,
                    ...(0, adtObjectOps_1.writtenActivationFields)(activation),
                    message: activation
                        ? (0, adtMessages_1.describeActivation)(activation, `Data element ${dataElementName}`)
                        : `Data element ${dataElementName} updated successfully`,
                    data_element_details: dataElementDetails,
                }),
            });
        }
        catch (error) {
            logger?.error(`Error updating data element ${dataElementName}: ${error?.message || error}`);
            // Handle specific error cases
            if (error.message?.includes('not found') ||
                error.response?.status === 404) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Data element ${dataElementName} not found.`);
            }
            if (error.message?.includes('locked') || error.response?.status === 403) {
                throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Data element ${dataElementName} is locked by another user or session. Please try again later.`);
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to update data element ${dataElementName}: ${errorMessage}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateDataElement.js.map