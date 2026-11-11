"use strict";
/**
 * CheckTable Handler - Syntax check for ABAP table via ADT API
 *
 * Uses runTableCheckRun from @mcp-abap-adt/adt-clients/core/table for table-specific checking.
 * Requires session_id for stateful operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckTable = handleCheckTable;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const sessionUtils_1 = require("../../../lib/sessionUtils");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CheckTableLow',
    available_in: ['onprem', 'cloud'],
    description: '[low-level] Perform syntax check on an ABAP table. Returns syntax errors, warnings, and messages. Requires session_id for stateful operations. Can use session_id and session_state from GetSession to maintain the same session. If ddl_code is provided, validates new/unsaved code (will be base64 encoded in request).',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., Z_MY_TABLE)',
            },
            ddl_code: {
                type: 'string',
                description: 'Optional DDL to check INSTEAD of the stored version. The object must ALREADY EXIST. Note this parameter was accepted and then silently DROPPED before 2026-08-26 for tables and structures (the dependency hardcoded no-source), so a verdict from an older build described the stored version, not this DDL.',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' (last activated), 'inactive' (current unsaved), or 'new'." +
                    " Default: active — a DDIC object with no inactive version cannot be checked as 'inactive'/'new' (SAP answers \"Error while importing object ... from the database\").",
                enum: ['active', 'inactive', 'new'],
            },
            reporter: {
                type: 'string',
                description: "Check reporter: 'tableStatusCheck' or 'abapCheckRun'. Default: abapCheckRun",
                enum: ['tableStatusCheck', 'abapCheckRun'],
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
        required: ['table_name'],
    },
};
/**
 * Main handler for CheckTable MCP tool
 */
async function handleCheckTable(context, args) {
    const { connection, logger } = context;
    try {
        const { table_name, ddl_code, version = 'active', reporter = 'abapCheckRun', session_id, session_state, } = args;
        if (!table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        const validReporters = ['tableStatusCheck', 'abapCheckRun'];
        const checkReporter = reporter && validReporters.includes(reporter)
            ? reporter
            : 'abapCheckRun';
        const validVersions = ['active', 'inactive', 'new'];
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
        // Restore session state if provided
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        // Use provided session_id or generate new one (required for table check)
        const sessionId = session_id || (0, sessionUtils_1.generateSessionId)();
        const tableName = table_name.toUpperCase();
        logger?.info(`Starting table check: ${tableName} (reporter: ${checkReporter}, version: ${checkVersion}, session: ${sessionId.substring(0, 8)}..., ${ddl_code ? 'with new code' : 'saved version'})`);
        try {
            const builder = (0, clients_1.createAdtClient)(connection, logger);
            // Check table with optional source code (for validating new/unsaved code)
            // If ddl_code is provided, it will be base64 encoded in the request body
            // NOTE the dependency's AdtTable.check() hardcodes `undefined` where
            // ddl_code belongs — the log line above even said "with new code" while
            // the verdict was about the STORED version.
            const report = await (0, adtObjectOps_1.checkObjectAndReport)(connection, {
                objectUri: (0, adtObjectOps_1.buildActivationUri)(tableName, 'TABL'),
                subject: `table ${tableName}`,
                version: checkVersion,
                sourceCode: ddl_code,
            });
            // Parse check results
            const checkResult = report.check_result;
            // Get updated session state after check
            logger?.info(`✅ CheckTable completed: ${tableName}`);
            logger?.info(`   Status: ${checkResult.status}`);
            logger?.info(`   Errors: ${checkResult.errors.length}, Warnings: ${checkResult.warnings.length}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: report.success,
                    table_name: tableName,
                    version: checkVersion,
                    reporter: checkReporter,
                    check_result: checkResult,
                    session_id: sessionId,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: report.message,
                    findings: report.findings,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error checking table ${tableName}:`, error);
            let errorMessage = `Failed to check table: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Table ${tableName} not found.`;
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
//# sourceMappingURL=handleCheckTable.js.map