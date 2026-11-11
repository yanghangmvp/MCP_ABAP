/**
 * CheckView Handler - Syntax check for ABAP View
 *
 * Uses AdtClient.checkView from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckViewLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Perform syntax check on an ABAP view. Returns syntax errors, warnings, and messages. Can use session_id and session_state from GetSession to maintain the same session. If ddl_source is provided, validates new/unsaved code (will be base64 encoded in request).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., Z_MY_PROGRAM).";
            };
            readonly ddl_source: {
                readonly type: "string";
                readonly description: "Optional DDL to check INSTEAD of the stored version. The object must ALREADY EXIST. Note this parameter was accepted and then silently DROPPED before 2026-08-26 for tables and structures (the dependency hardcoded no-source), so a verdict from an older build described the stored version, not this DDL.";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to check: 'active' (last activated) or 'inactive' (current unsaved). Default: active — a DDIC object with no inactive version cannot be checked as 'inactive'.";
                readonly enum: readonly ["active", "inactive"];
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
        readonly required: readonly ["view_name"];
    };
};
interface CheckViewArgs {
    view_name: string;
    ddl_source?: string;
    version?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CheckView MCP tool
 *
 * Uses AdtClient.checkView - low-level single method call
 */
export declare function handleCheckView(context: HandlerContext, args: CheckViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckView.d.ts.map