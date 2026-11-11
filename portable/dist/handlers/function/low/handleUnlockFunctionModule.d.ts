/**
 * UnlockFunctionModule Handler - Unlock ABAP Function Module
 *
 * Uses AdtClient.unlockFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP function module after modification. Requires the lock_handle from LockFunctionModule operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_MY_FUNCTION).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZFG_MY_GROUP).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockFunctionModule operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockFunctionModule operation. Must be the same as used in LockFunctionModule.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockFunctionModule (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["function_module_name", "function_group_name", "lock_handle"];
    };
};
interface UnlockFunctionModuleArgs {
    function_module_name: string;
    function_group_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockFunctionModule MCP tool
 *
 * Uses AdtClient.unlockFunctionModule - low-level single method call
 */
export declare function handleUnlockFunctionModule(context: HandlerContext, args: UnlockFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockFunctionModule.d.ts.map