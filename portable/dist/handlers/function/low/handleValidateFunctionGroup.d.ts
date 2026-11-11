/**
 * ValidateFunctionGroup Handler - Validate ABAP FunctionGroup Name
 *
 * Uses AdtClient.validateFunctionGroup from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateFunctionGroupLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Validate an ABAP function group name before creation. Checks if the name is valid and available. Returns validation result with success status and message. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name to validate (e.g., Z_MY_PROGRAM).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name for validation (optional but recommended).";
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
        readonly required: readonly ["function_group_name"];
    };
};
interface ValidateFunctionGroupArgs {
    function_group_name: string;
    package_name?: string;
    description?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ValidateFunctionGroup MCP tool
 *
 * Uses AdtClient.validateFunctionGroup - low-level single method call
 */
export declare function handleValidateFunctionGroup(context: HandlerContext, args: ValidateFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateFunctionGroup.d.ts.map