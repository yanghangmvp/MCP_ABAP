/**
 * CheckTable Handler - Syntax check for ABAP table via ADT API
 *
 * Uses runTableCheckRun from @mcp-abap-adt/adt-clients/core/table for table-specific checking.
 * Requires session_id for stateful operations.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckTableLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Perform syntax check on an ABAP table. Returns syntax errors, warnings, and messages. Requires session_id for stateful operations. Can use session_id and session_state from GetSession to maintain the same session. If ddl_code is provided, validates new/unsaved code (will be base64 encoded in request).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., Z_MY_TABLE)";
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Optional DDL to check INSTEAD of the stored version. The object must ALREADY EXIST. Note this parameter was accepted and then silently DROPPED before 2026-08-26 for tables and structures (the dependency hardcoded no-source), so a verdict from an older build described the stored version, not this DDL.";
            };
            readonly version: {
                readonly type: "string";
                readonly description: string;
                readonly enum: readonly ["active", "inactive", "new"];
            };
            readonly reporter: {
                readonly type: "string";
                readonly description: "Check reporter: 'tableStatusCheck' or 'abapCheckRun'. Default: abapCheckRun";
                readonly enum: readonly ["tableStatusCheck", "abapCheckRun"];
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                    };
                };
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface CheckTableArgs {
    table_name: string;
    ddl_code?: string;
    version?: string;
    reporter?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CheckTable MCP tool
 */
export declare function handleCheckTable(context: HandlerContext, args: CheckTableArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckTable.d.ts.map