"use strict";
/**
 * ActivateInterface Handler - Activate ABAP Interface
 *
 * Uses AdtClient.activateInterface from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleActivateInterface = handleActivateInterface;
const adtMessages_1 = require("../../../lib/adtMessages");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ActivateInterfaceLow',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Activate, Create, Update. Subject: Interface. Will be useful for activating, creating, or updating interface. [low-level] Activate an ABAP interface. Returns activation status and any warnings/errors. Can use session_id and session_state from GetSession to maintain the same session.',
    inputSchema: {
        type: 'object',
        properties: {
            interface_name: {
                type: 'string',
                description: 'Interface name (e.g., ZIF_MY_INTERFACE).',
            },
            session_id: {
                type: 'string',
                description: 'Session ID from GetSession. If not provided, a new session will be created.',
            },
            session_state: {
                type: 'object',
                description: 'Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.',
                properties: {
                    cookies: { type: 'string' },
                    csrf_token: { type: 'string' },
                    cookie_store: { type: 'object' },
                },
            },
        },
        required: ['interface_name'],
    },
};
/**
 * Main handler for ActivateInterface MCP tool
 *
 * Uses AdtClient.activateInterface - low-level single method call
 */
async function handleActivateInterface(context, args) {
    const { connection, logger } = context;
    try {
        const { interface_name, session_id, session_state } = args;
        // Validation
        if (!interface_name) {
            return (0, utils_1.return_error)(new Error('interface_name is required'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        // Restore session state if provided
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        const interfaceName = interface_name.toUpperCase();
        logger?.info(`Starting interface activation: ${interfaceName}`);
        try {
            // Activate interface
            const activateState = await client
                .getInterface()
                .activate({ interfaceName: interfaceName });
            const response = activateState.activateResult;
            if (!response) {
                throw new Error(`Activation did not return a response for interface ${interfaceName}`);
            }
            // Parse activation response
            const activationResult = (0, utils_1.parseActivationResponse)(response.data);
            // Success comes from SAP's MESSAGES, not from activated/checked: those
            // flags say the activation RUN and CHECK executed, not that the object
            // survived them (a rejected object still reports activated:true).
            const outcome = (0, adtMessages_1.evaluateActivation)(activationResult);
            const success = outcome.success;
            // Get updated session state after activation
            logger?.info(`✅ ActivateInterface completed: ${interfaceName}`);
            logger?.debug(`Activated: ${activationResult.activated}, Checked: ${activationResult.checked}, Messages: ${activationResult.messages.length}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success,
                    interface_name: interfaceName,
                    activation: (0, adtMessages_1.activationFlags)(activationResult, outcome),
                    messages: outcome.messages,
                    warnings: outcome.warnings,
                    errors: outcome.errors,
                    session_id: session_id || null,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: success
                        ? `Interface ${interfaceName} activated successfully`
                        : `Activation FAILED for Interface ${interfaceName}: ${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error activating interface ${interfaceName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to activate interface: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Interface ${interfaceName} not found.`;
            }
            else if (error.response?.data &&
                typeof error.response.data === 'string') {
                try {
                    const { XMLParser } = require('fast-xml-parser');
                    const parser = new XMLParser({
                        ignoreAttributes: false,
                        attributeNamePrefix: '@_',
                    });
                    const errorData = parser.parse(error.response.data);
                    const errorMsg = errorData['exc:exception']?.message?.['#text'] ||
                        errorData['exc:exception']?.message;
                    if (errorMsg) {
                        errorMessage = `SAP Error: ${errorMsg}`;
                    }
                }
                catch (_parseError) {
                    // Ignore parse errors
                }
            }
            return (0, utils_1.return_error)(new Error(errorMessage));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleActivateInterface.js.map