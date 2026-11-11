"use strict";
/**
 * UpdateDomain Handler - Update Existing ABAP Domain
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 * Note: No validation step - lock will fail if domain doesn't exist
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateDomain = handleUpdateDomain;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const domainXml_1 = require("../../../lib/domainXml");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'UpdateDomain',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: Domain. Will be useful for updating or creating domain. Update an existing ABAP domain. Locks, updates with provided parameters (complete replacement), unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            domain_name: {
                type: 'string',
                description: 'Domain name to update (e.g., ZZ_TEST_0001)',
            },
            description: {
                type: 'string',
                description: 'New domain description (optional)',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            datatype: {
                type: 'string',
                description: 'Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.',
            },
            length: {
                type: 'number',
                description: 'Field length (max depends on datatype)',
            },
            decimals: {
                type: 'number',
                description: 'Decimal places (for DEC, CURR, QUAN types)',
            },
            conversion_exit: {
                type: 'string',
                description: 'Conversion exit routine name (without CONVERSION_EXIT_ prefix)',
            },
            lowercase: {
                type: 'boolean',
                description: 'Allow lowercase input',
            },
            sign_exists: {
                type: 'boolean',
                description: 'Field has sign (+/-)',
            },
            value_table: {
                type: 'string',
                description: 'Value table name for foreign key relationship',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
                default: true,
            },
            fixed_values: {
                type: 'array',
                description: 'Array of fixed values for domain value range',
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
        required: ['domain_name', 'package_name'],
    },
};
/**
 * Main handler for UpdateDomain tool
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleUpdateDomain(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.domain_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Domain name is required');
        }
        if (!args?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        // Validate transport_request: required for non-$TMP packages
        (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        const typedArgs = args;
        const domainName = typedArgs.domain_name.toUpperCase();
        logger?.info(`Starting domain update: ${domainName}`);
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            const shouldActivate = typedArgs.activate !== false; // Default to true if not specified
            // Lock domain (will fail if domain doesn't exist)
            // Pass packageName to lockDomain so builder is created with correct config from the start
            let lockHandle;
            try {
                lockHandle = await client.getDomain().lock({
                    domainName,
                    packageName: typedArgs.package_name,
                });
                // Write changed fields via read-modify-write.
                //
                // NOTE: bypasses client.getDomain().update() on purpose — that builder
                // can only replace elements already present in the GET response and
                // silently drops values when a subtree is missing. writeDomainContent
                // inserts missing nodes. Only fields actually provided are touched.
                await (0, domainXml_1.writeDomainContent)(connection, domainName, {
                    description: typedArgs.description,
                    datatype: typedArgs.datatype,
                    length: typedArgs.length,
                    decimals: typedArgs.decimals,
                    conversion_exit: typedArgs.conversion_exit,
                    lowercase: typedArgs.lowercase,
                    sign_exists: typedArgs.sign_exists,
                    value_table: typedArgs.value_table,
                    fixed_values: typedArgs.fixed_values,
                }, lockHandle, typedArgs.transport_request);
                // Check
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getDomain().check({ domainName }), domainName, {
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
                        await client.getDomain().unlock({ domainName }, lockHandle);
                        logger?.info(`Domain unlocked: ${domainName}`);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock domain ${domainName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getDomain()
                    .read({ domainName }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            let activation;
            // Activate if requested — and report SAP's verdict, not the request flag.
            activation = shouldActivate
                ? await (0, adtObjectOps_1.activateWrittenObject)(connection, domainName, 'DOMA', `Domain ${domainName}`, 'updated')
                : undefined;
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    domain_name: domainName,
                    package: typedArgs.package_name,
                    transport_request: typedArgs.transport_request,
                    ...(0, adtObjectOps_1.writtenActivationFields)(activation),
                    message: activation
                        ? (0, adtMessages_1.describeActivation)(activation, `Domain ${domainName}`)
                        : `Domain ${domainName} updated successfully`,
                }),
            });
        }
        catch (error) {
            logger?.error(`Error updating domain ${domainName}: ${error?.message || error}`);
            // Handle specific error cases
            if (error.message?.includes('not found') ||
                error.response?.status === 404) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Domain ${domainName} not found.`);
            }
            if (error.message?.includes('locked') || error.response?.status === 403) {
                throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Domain ${domainName} is locked by another user or session. Please try again later.`);
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to update domain ${domainName}: ${errorMessage}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateDomain.js.map