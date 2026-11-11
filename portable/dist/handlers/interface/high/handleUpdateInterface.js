"use strict";
/**
 * UpdateInterface Handler - Update existing ABAP Interface source code
 *
 * Uses InterfaceBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateInterface = handleUpdateInterface;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateInterface',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Update, Create. Subject: Interface. Will be useful for updating or creating interface. Update source code of an existing ABAP interface. Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            interface_name: {
                type: 'string',
                description: 'Interface name (e.g., ZIF_MY_INTERFACE). Must exist in the system.',
            },
            source_code: {
                type: 'string',
                description: 'Complete ABAP interface source code with INTERFACE...ENDINTERFACE section.',
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
        required: ['interface_name', 'source_code'],
    },
};
/**
 * Main handler for UpdateInterface MCP tool
 *
 * Uses InterfaceBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleUpdateInterface(context, args) {
    const { connection, logger } = context;
    try {
        const { interface_name, source_code, transport_request, activate = true, } = args;
        // Validation
        if (!interface_name || !source_code) {
            return (0, utils_1.return_error)(new Error('interface_name and source_code are required'));
        }
        const interfaceName = interface_name.toUpperCase();
        logger?.info(`Starting interface source update: ${interfaceName}`);
        try {
            // Get configuration from environment variables
            // Create logger for connection (only logs when DEBUG_CONNECTORS is enabled)
            // Create connection directly for this handler call
            // Get connection from session context (set by ProtocolHandler)
            // Connection is managed and cached per session, with proper token refresh via AuthBroker
            logger?.debug(`[UpdateInterface] Created separate connection for handler call: ${interfaceName}`);
        }
        catch (connectionError) {
            const errorMessage = connectionError instanceof Error
                ? connectionError.message
                : String(connectionError);
            logger?.error(`[UpdateInterface] Failed to create connection: ${errorMessage}`);
            return (0, utils_1.return_error)(new Error(`Failed to create connection: ${errorMessage}`));
        }
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Build operation chain: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
            // Note: No validation needed for update - interface must already exist
            const shouldActivate = activate !== false; // Default to true if not specified
            let activateResponse;
            let lockHandle;
            try {
                // Lock
                lockHandle = await client.getInterface().lock({ interfaceName });
                // Step 1: Check new code BEFORE update (only when activating)
                if (shouldActivate) {
                    logger?.info(`[UpdateInterface] Checking new code before update: ${interfaceName}`);
                    try {
                        await (0, adtObjectOps_1.checkSourceOrThrow)(connection, (0, adtObjectOps_1.buildActivationUri)(interfaceName, 'INTF'), source_code, `interface ${interfaceName}`);
                        logger?.info(`[UpdateInterface] New code check passed: ${interfaceName}`);
                    }
                    catch (checkError) {
                        if (checkError.isAlreadyChecked) {
                            logger?.info(`[UpdateInterface] Interface ${interfaceName} was already checked - continuing`);
                        }
                        else {
                            logger?.error(`[UpdateInterface] New code check failed: ${interfaceName} | ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                            throw new Error(`New code check failed: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                        }
                    }
                }
                else {
                    logger?.info(`[UpdateInterface] Skipping syntax check (activate=false): ${interfaceName}`);
                }
                // Step 2: Update
                logger?.info(`[UpdateInterface] Updating interface source code: ${interfaceName}`);
                await client.getInterface().update({
                    interfaceName,
                    sourceCode: source_code,
                    transportRequest: transport_request,
                }, { lockHandle });
                logger?.info(`[UpdateInterface] Interface source code updated: ${interfaceName}`);
            }
            finally {
                if (lockHandle) {
                    try {
                        await client.getInterface().unlock({ interfaceName }, lockHandle);
                        logger?.info(`[UpdateInterface] Interface unlocked: ${interfaceName}`);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock interface ${interfaceName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Step 4: Check inactive version (after unlock, only when activating)
            if (shouldActivate) {
                logger?.info(`[UpdateInterface] Checking inactive version: ${interfaceName}`);
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getInterface().check({ interfaceName }, 'inactive'), interfaceName, {
                        debug: (message) => logger?.debug(`[UpdateInterface] ${message}`),
                    });
                    logger?.info(`[UpdateInterface] Inactive version check completed: ${interfaceName}`);
                }
                catch (checkError) {
                    if (checkError.isAlreadyChecked) {
                        logger?.info(`[UpdateInterface] Interface ${interfaceName} was already checked - continuing`);
                    }
                    else {
                        logger?.warn(`[UpdateInterface] Inactive version check had issues: ${interfaceName} | ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                    }
                }
            }
            // Activate if requested
            if (shouldActivate) {
                const activateState = await client
                    .getInterface()
                    .activate({ interfaceName });
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
                throw new Error(`Interface ${interfaceName} source was updated but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive; ` +
                    `fix the source and update again.`);
            }
            const activationWarnings = activation?.warnings.length
                ? activation.warnings.map((m) => `${m.type}: ${m.text}`)
                : [];
            logger?.info(`✅ UpdateInterface completed successfully: ${interfaceName}`);
            // Return success result
            const stepsCompleted = [
                'lock',
                'check_new_code',
                'update',
                'unlock',
                'check_inactive',
            ];
            if (shouldActivate) {
                stepsCompleted.push('activate');
            }
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    interface_name: interfaceName,
                    transport_request: transport_request || 'local',
                    // SAP's verdict, not the request flag.
                    activated: activation ? activation.activated : false,
                    message: `Interface ${interfaceName} updated successfully${shouldActivate ? ' and activated' : ''}`,
                    activation_warnings: activationWarnings.length > 0 ? activationWarnings : undefined,
                    steps_completed: stepsCompleted,
                }),
            });
        }
        catch (error) {
            logger?.error(`Error updating interface source ${interfaceName}: ${error?.message || error}`);
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to update interface: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateInterface.js.map