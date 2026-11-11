/**
 * ValidateFunctionModule Handler - Validate ABAP function module name via ADT API
 *
 * Uses validateFunctionModuleName from @mcp-abap-adt/adt-clients/core/functionModule for function module-specific validation.
 * Requires function group name.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Validate an ABAP function module name before creation. Checks if the name is valid and available. Requires function group name. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., Z_FUGR_TEST_0001)";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name to validate (e.g., Z_TEST_FM)";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description for validation";
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
interface ValidateFunctionModuleArgs {
    function_group_name: string;
    function_module_name: string;
    description?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ValidateFunctionModule MCP tool
 */
export declare function handleValidateFunctionModule(context: HandlerContext, args: ValidateFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateFunctionModule.d.ts.map