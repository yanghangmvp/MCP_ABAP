"use strict";
/**
 * CheckBehaviorDefinition Handler - Syntax check for ABAP BehaviorDefinition
 *
 * Uses AdtClient.checkBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckBehaviorDefinition = handleCheckBehaviorDefinition;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CheckBdefLow',
    available_in: ['onprem', 'cloud'],
    description: '[low-level] Perform syntax check on an ABAP behavior definition. Returns syntax errors, warnings, and messages. Can use session_id and session_state from GetSession to maintain the same session.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'BehaviorDefinition name (e.g., Z_MY_PROGRAM).',
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
        required: ['name'],
    },
};
/**
 * Main handler for CheckBehaviorDefinition MCP tool
 *
 * Uses AdtClient.checkBehaviorDefinition - low-level single method call
 */
async function handleCheckBehaviorDefinition(context, args) {
    const { connection, logger } = context;
    try {
        const { name, session_id, session_state } = args;
        // Validation
        if (!name) {
            return (0, utils_1.return_error)(new Error('name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        // Restore session state if provided
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        else {
            // Ensure connection is established
        }
        const bdefName = name.toUpperCase();
        logger?.info(`Starting behavior definition check: ${bdefName}`);
        try {
            const report = await (0, adtObjectOps_1.checkObjectAndReport)(connection, {
                objectUri: (0, adtObjectOps_1.buildActivationUri)(bdefName, 'BDEF'),
                subject: `behavior definition ${bdefName}`,
                version: 'inactive',
            });
            const checkResult = report.check_result;
            // Get updated session state after check
            logger?.info(`✅ CheckBehaviorDefinition completed: ${bdefName}`);
            logger?.info(`   Status: ${checkResult.status}`);
            logger?.info(`   Errors: ${checkResult.errors.length}, Warnings: ${checkResult.warnings.length}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: report.success,
                    name: bdefName,
                    check_result: checkResult,
                    session_id: session_id || null,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: report.message,
                    findings: report.findings,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error checking behavior definition ${bdefName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to check behavior definition: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `BehaviorDefinition ${bdefName} not found.`;
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
//# sourceMappingURL=handleCheckBehaviorDefinition.js.map