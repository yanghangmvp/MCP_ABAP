"use strict";
/**
 * CreateDomain Handler - ABAP Domain Creation via ADT API
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: create -> check -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateDomain = handleCreateDomain;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const domainXml_1 = require("../../../lib/domainXml");
const transportConflict_1 = require("../../../lib/transportConflict");
const utils_1 = require("../../../lib/utils");
const transportValidation_1 = require("../../../utils/transportValidation");
exports.TOOL_DEFINITION = {
    name: 'CreateDomain',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: Domain. Will be useful for creating domain. Create a new ABAP domain in SAP system. Creates the domain object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            domain_name: {
                type: 'string',
                description: 'Domain name (e.g., ZZ_TEST_0001). Must follow SAP naming conventions.',
            },
            description: {
                type: 'string',
                description: '(optional) Domain description. If not provided, domain_name will be used.',
            },
            package_name: {
                type: 'string',
                description: '(optional) Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: '(optional) Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            datatype: {
                type: 'string',
                description: '(optional) Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.',
                default: 'CHAR',
            },
            length: {
                type: 'number',
                description: '(optional) Field length (max depends on datatype)',
                default: 100,
            },
            decimals: {
                type: 'number',
                description: '(optional) Decimal places (for DEC, CURR, QUAN types)',
                default: 0,
            },
            conversion_exit: {
                type: 'string',
                description: '(optional) Conversion exit routine name (without CONVERSION_EXIT_ prefix)',
            },
            lowercase: {
                type: 'boolean',
                description: '(optional) Allow lowercase input',
                default: false,
            },
            sign_exists: {
                type: 'boolean',
                description: '(optional) Field has sign (+/-)',
                default: false,
            },
            value_table: {
                type: 'string',
                description: '(optional) Value table name for foreign key relationship',
            },
            activate: {
                type: 'boolean',
                description: '(optional) Activate domain after creation (default: true)',
                default: true,
            },
            fixed_values: {
                type: 'array',
                description: '(optional) Array of fixed values for domain value range',
                items: {
                    type: 'object',
                    properties: {
                        low: {
                            type: 'string',
                            description: "Fixed value (e.g., '001', 'A')",
                        },
                        text: {
                            type: 'string',
                            description: 'Description text for the fixed value',
                        },
                    },
                    required: ['low', 'text'],
                },
            },
        },
        required: ['domain_name'],
    },
};
/**
 * Main handler for CreateDomain MCP tool
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleCreateDomain(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.domain_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Domain name is required');
        }
        if (!args?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        // Validate transport_request: required for non-$TMP, non-ZLOCAL packages
        (0, transportValidation_1.validateTransportRequest)(args.package_name, args.transport_request, args.super_package);
        const typedArgs = args;
        const domainName = typedArgs.domain_name.toUpperCase();
        (0, utils_1.assertNameLength)('domain', domainName, 'Domain');
        logger?.info(`Starting domain creation: ${domainName}`);
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = typedArgs.activate !== false;
        let lockHandle;
        let createdUri;
        // What the write ACTUALLY went into — not what the caller passed.
        let transportUsed = typedArgs.transport_request;
        const warnings = [];
        try {
            // Validate — fail fast BEFORE create/lock if the name is taken.
            await (0, utils_1.assertObjectDoesNotExist)(`Domain ${domainName}`, () => client.getDomain().validate({
                domainName,
                packageName: typedArgs.package_name,
                description: typedArgs.description || domainName,
            }), connection);
            // Create (registers bare object in SAP)
            await client.getDomain().create({
                domainName,
                description: typedArgs.description || domainName,
                packageName: typedArgs.package_name,
                transportRequest: typedArgs.transport_request,
            });
            createdUri = (0, adtObjectOps_1.buildActivationUri)(domainName, 'DOMA');
            // Lock
            lockHandle = await client.getDomain().lock({ domainName });
            // Captured so the write closure below keeps the narrowed (defined) type.
            const domainLock = lockHandle;
            // Write type information via read-modify-write.
            //
            // NOTE: this intentionally bypasses client.getDomain().update(). That
            // builder can only *replace* elements already present in the GET
            // response, so on a freshly created bare domain (which has no
            // <doma:content> subtree yet) datatype / length / decimals / description
            // were silently dropped. writeDomainContent inserts the missing subtree.
            // Follow SAP if the bare create landed in a different request than the
            // caller passed (a TASK resolves to its PARENT request) — otherwise this
            // PUT is refused and the domain keeps its default type. See transportConflict.
            const write = await (0, transportConflict_1.runUnderResolvedTransport)((transportRequest) => (0, domainXml_1.writeDomainContent)(connection, domainName, {
                description: typedArgs.description || domainName,
                datatype: typedArgs.datatype || 'CHAR',
                length: typedArgs.length ?? 100,
                decimals: typedArgs.decimals ?? 0,
                // Optional output/value fields are written only when the caller
                // actually supplied them, so a basic domain create emits just the
                // mandatory <doma:typeInformation> block (lowest chance of the PUT
                // being rejected for an incomplete optional subtree).
                conversion_exit: typedArgs.conversion_exit,
                lowercase: typedArgs.lowercase,
                sign_exists: typedArgs.sign_exists,
                value_table: typedArgs.value_table,
                fixed_values: typedArgs.fixed_values,
            }, domainLock, transportRequest), typedArgs.transport_request, `Domain ${domainName}`, logger);
            transportUsed = write.transport_used;
            if (write.warning)
                warnings.push(write.warning);
            // Unlock
            await client.getDomain().unlock({ domainName }, lockHandle);
            lockHandle = undefined;
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getDomain()
                    .read({ domainName }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            // Check
            try {
                await (0, utils_1.safeCheckOperation)(() => client.getDomain().check({ domainName }), domainName, {
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
                ? await (0, adtObjectOps_1.activateWrittenObject)(connection, domainName, 'DOMA', `Domain ${domainName}`, 'created')
                : undefined;
            logger?.info(`✅ CreateDomain completed: ${domainName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    domain_name: domainName,
                    package: typedArgs.package_name,
                    transport_request: transportUsed,
                    ...(transportUsed !== typedArgs.transport_request
                        ? { transport_request_requested: typedArgs.transport_request }
                        : {}),
                    ...(warnings.length ? { warnings } : {}),
                    ...(0, adtObjectOps_1.writtenActivationFields)(activation),
                    message: activation
                        ? (0, adtMessages_1.describeActivation)(activation, `Domain ${domainName}`)
                        : `Domain ${domainName} created successfully`,
                }),
            });
        }
        catch (error) {
            if (lockHandle) {
                try {
                    await client.getDomain().unlock({ domainName }, lockHandle);
                }
                catch (_unlockError) {
                    // Ignore unlock errors during cleanup
                }
            }
            logger?.error(`Error creating domain ${domainName}: ${error?.message || error}`);
            if (error.message?.includes('already exists') ||
                error.response?.data?.includes('ExceptionResourceAlreadyExists')) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Domain ${domainName} already exists. Please delete it first or use a different name.`);
            }
            let errorMessage;
            if (error.response?.data) {
                errorMessage =
                    typeof error.response.data === 'string'
                        ? error.response.data
                        : String(error.response.data).substring(0, 500);
            }
            else {
                errorMessage = error.message || String(error);
            }
            // field report round 6, F-4. The object was registered in SAP before this failed,
            // and until now it stayed there: an inactive shell that nothing reports
            // and that blocks later activations in its package. Only PRE-ACTIVATION
            // failures are cleaned up here — a failure to ACTIVATE leaves a usable
            // object on purpose, and `activateWrittenObject` already names it and
            // says what to do with it.
            const conflicting = (0, transportConflict_1.extractConflictingRequest)(error, typedArgs.transport_request);
            const cleanup = createdUri
                ? await (0, adtDeletion_1.removePartialCreation)(connection, {
                    objectUri: createdUri,
                    objectLabel: `domain ${domainName}`,
                    transportRequest: typedArgs.transport_request,
                    retryHint: conflicting
                        ? (0, transportConflict_1.describeTransportRecovery)('UpdateDomain', conflicting)
                        : undefined,
                    logger,
                })
                : '';
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to create domain ${domainName}: ${errorMessage}${cleanup}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateDomain.js.map