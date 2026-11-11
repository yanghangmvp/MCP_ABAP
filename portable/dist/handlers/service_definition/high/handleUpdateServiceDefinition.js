"use strict";
/**
 * UpdateServiceDefinition Handler - Update Existing ABAP Service Definition Source
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateServiceDefinition = handleUpdateServiceDefinition;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateServiceDefinition',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: ServiceDefinition. Will be useful for updating or creating service definition. Update source code of an existing ABAP service definition. Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            service_definition_name: {
                type: 'string',
                description: 'Service definition name (e.g., ZSD_MY_SERVICE). Must exist in the system.',
            },
            source_code: {
                type: 'string',
                description: 'Complete service definition source code.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['service_definition_name', 'source_code'],
    },
};
/**
 * Main handler for UpdateServiceDefinition MCP tool
 *
 * Uses AdtClient for all operations
 * Session and lock management handled internally by client
 */
async function handleUpdateServiceDefinition(context, args) {
    const { connection, logger } = context;
    try {
        const { service_definition_name, source_code, transport_request, activate = true, } = args;
        // Validation
        if (!service_definition_name || !source_code) {
            return (0, utils_1.return_error)(new Error('service_definition_name and source_code are required'));
        }
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        const serviceDefinitionName = service_definition_name.toUpperCase();
        logger?.info(`Starting service definition source update: ${serviceDefinitionName}`);
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Build operation chain: lock -> update -> check -> unlock -> (activate)
            // Note: No validation needed for update - service definition must already exist
            const shouldActivate = activate !== false; // Default to true if not specified
            // Lock
            let lockHandle;
            let activateResponse;
            try {
                lockHandle = await client
                    .getServiceDefinition()
                    .lock({ serviceDefinitionName });
                // Update source code
                await client.getServiceDefinition().update({
                    serviceDefinitionName,
                    sourceCode: source_code,
                    transportRequest: args.transport_request,
                }, { lockHandle });
                // Check
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getServiceDefinition().check({ serviceDefinitionName }), serviceDefinitionName, {
                        debug: (message) => logger?.debug(`[UpdateServiceDefinition] ${message}`),
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
                            .getServiceDefinition()
                            .unlock({ serviceDefinitionName }, lockHandle);
                        logger?.info(`[UpdateServiceDefinition] Service definition unlocked: ${serviceDefinitionName}`);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock service definition ${serviceDefinitionName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getServiceDefinition()
                    .read({ serviceDefinitionName }, 'inactive', {
                    withLongPolling: true,
                });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            // Activate if requested
            if (shouldActivate) {
                const activateState = await client
                    .getServiceDefinition()
                    .activate({ serviceDefinitionName });
                activateResponse = activateState.activateResult;
            }
            // Evaluate SAP's ACTUAL activation result.
            //
            // The activation response used to be scraped for display-only "warnings"
            // while the reported `activated` field was a copy of the caller's own
            // `activate` request parameter — so an activation SAP REFUSED was still
            // announced as success (the dep's activate() wrapper never parses the
            // response body at all). Any error-level message now fails the call.
            const activation = shouldActivate
                ? (0, adtObjectOps_1.evaluateActivationResponse)(activateResponse)
                : undefined;
            if (activation && !activation.success) {
                throw new Error(`Service definition ${serviceDefinitionName} source was updated but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive; ` +
                    `fix the source and update again.`);
            }
            const activationWarnings = activation?.warnings.length
                ? activation.warnings.map((m) => `${m.type}: ${m.text}`)
                : [];
            logger?.info(`✅ UpdateServiceDefinition completed successfully: ${serviceDefinitionName}`);
            // Return success result
            const stepsCompleted = ['lock', 'update', 'check', 'unlock'];
            if (shouldActivate) {
                stepsCompleted.push('activate');
            }
            const result = {
                success: true,
                service_definition_name: serviceDefinitionName,
                transport_request: transport_request || 'local',
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                message: shouldActivate
                    ? `Service Definition ${serviceDefinitionName} updated and activated successfully`
                    : `Service Definition ${serviceDefinitionName} updated successfully (not activated)`,
                uri: `/sap/bc/adt/ddic/srvd/sources/${(0, utils_1.encodeSapObjectName)(serviceDefinitionName)}`,
                steps_completed: stepsCompleted,
                activation_warnings: activationWarnings.length > 0 ? activationWarnings : undefined,
                source_size_bytes: source_code.length,
            };
            return (0, utils_1.return_response)({
                data: JSON.stringify(result, null, 2),
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            });
        }
        catch (error) {
            logger?.error(`Error updating service definition source ${serviceDefinitionName}:`, error);
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to update service definition: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateServiceDefinition.js.map