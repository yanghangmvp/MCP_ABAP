/**
 * CheckFunctionModule Handler - Syntax check for ABAP function module via ADT API
 *
 * Uses checkFunctionModule from @mcp-abap-adt/adt-clients/core/functionModule for function module-specific checking.
 * Requires function group name.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Perform syntax check on an ABAP function module. Returns syntax errors, warnings, and messages. Requires function group name. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., Z_FUGR_TEST_0001)";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_TEST_FM)";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to check: 'active' (last activated) or 'inactive' (current unsaved). Default: active";
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
        readonly required: readonly ["function_group_name", "function_module_name"];
    };
};
interface CheckFunctionModuleArgs {
    function_group_name: string;
    function_module_name: string;
    version?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CheckFunctionModule MCP tool
 */
export declare function handleCheckFunctionModule(context: HandlerContext, args: CheckFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckFunctionModule.d.ts.map