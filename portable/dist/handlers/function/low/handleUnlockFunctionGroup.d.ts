/**
 * UnlockFunctionGroup Handler - Unlock ABAP FunctionGroup
 *
 * Uses AdtClient.unlockFunctionGroup from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockFunctionGroupLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP function group after modification. Requires the lock_handle from LockFunctionGroup operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockFunctionGroup operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockFunctionGroup operation. Must be the same as used in LockFunctionGroup.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockFunctionGroup (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["function_group_name", "lock_handle"];
    };
};
interface UnlockFunctionGroupArgs {
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
 * Main handler for UnlockFunctionGroup MCP tool
 *
 * Uses AdtClient.unlockFunctionGroup - low-level single method call
 */
export declare function handleUnlockFunctionGroup(context: HandlerContext, args: UnlockFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockFunctionGroup.d.ts.map