"use strict";
/**
 * CheckView Handler - Syntax check for ABAP View
 *
 * Uses AdtClient.checkView from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckView = handleCheckView;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CheckViewLow',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: '[low-level] Perform syntax check on an ABAP view. Returns syntax errors, warnings, and messages. Can use session_id and session_state from GetSession to maintain the same session. If ddl_source is provided, validates new/unsaved code (will be base64 encoded in request).',
    inputSchema: {
        type: 'object',
        properties: {
            view_name: {
                type: 'string',
                description: 'View name (e.g., Z_MY_PROGRAM).',
            },
            ddl_source: {
                type: 'string',
                description: 'Optional DDL to check INSTEAD of the stored version. The object must ALREADY EXIST. Note this parameter was accepted and then silently DROPPED before 2026-08-26 for tables and structures (the dependency hardcoded no-source), so a verdict from an older build described the stored version, not this DDL.',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' (last activated) or 'inactive' (current unsaved). Default: active — a DDIC object with no inactive version cannot be checked as 'inactive'.",
                enum: ['active', 'inactive'],
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
        required: ['view_name'],
    },
};
/**
 * Main handler for CheckView MCP tool
 *
 * Uses AdtClient.checkView - low-level single method call
 */
async function handleCheckView(context, args) {
    const { connection, logger } = context;
    try {
        const { view_name, ddl_source, version = 'active', session_id, session_state, } = args;
        // Validation
        if (!view_name) {
            return (0, utils_1.return_error)(new Error('view_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        // Restore session state if provided
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        else {
            // Ensure connection is established
        }
        const viewName = view_name.toUpperCase();
        const validVersions = ['active', 'inactive'];
        // DEFAULT 'active', measured on DM2/310 (field report round 6). A DDIC object with no
        // inactive version answers the checkrun with status="notProcessed" and
        // "Error while importing object <NAME> from the database" for BOTH
        // 'inactive' and 'new' — so the old defaults meant a plain
        // `CheckTable(T100)` / `CheckStructure(X)` could never produce a verdict.
        // (It did not look broken before only because the dependency turned that
        // message-less report into an empty "check failed:" throw.) With a source
        // artifact the version makes no difference — all three behave identically.
        const checkVersion = version && validVersions.includes(version.toLowerCase())
            ? version.toLowerCase()
            : 'active';
        logger?.info(`Starting view check: ${viewName} (version: ${checkVersion}) ${ddl_source ? '(with new code)' : '(saved version)'}`);
        try {
            // Check view with optional source code (for validating new/unsaved code)
            // If ddl_source is provided, it will be base64 encoded in the request body
            const report = await (0, adtObjectOps_1.checkObjectAndReport)(connection, {
                objectUri: (0, adtObjectOps_1.buildActivationUri)(viewName, 'DDLS'),
                subject: `CDS view ${viewName}`,
                version: checkVersion,
                sourceCode: ddl_source,
            });
            // Parse check results
            const checkResult = report.check_result;
            // Get updated session state after check
            logger?.info(`✅ CheckView completed: ${viewName}`);
            logger?.info(`   Status: ${checkResult.status}`);
            logger?.info(`   Errors: ${checkResult.errors.length}, Warnings: ${checkResult.warnings.length}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: report.success,
                    view_name: viewName,
                    version: checkVersion,
                    check_result: checkResult,
                    session_id: session_id || null,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: report.message,
                    findings: report.findings,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error checking view ${viewName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to check view: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `View ${viewName} not found.`;
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
//# sourceMappingURL=handleCheckView.js.map