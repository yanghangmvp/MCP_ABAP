/**
 * UnlockInterface Handler - Unlock ABAP Interface
 *
 * Uses AdtClient.unlockInterface from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockInterfaceLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP interface after modification. Requires the lock_handle from LockInterface operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockInterface operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockInterface operation. Must be the same as used in LockInterface.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockInterface (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["interface_name", "lock_handle"];
    };
};
interface UnlockInterfaceArgs {
    interface_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockInterface MCP tool
 *
 * Uses AdtClient.unlockInterface - low-level single method call
 */
export declare function handleUnlockInterface(context: HandlerContext, args: UnlockInterfaceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockInterface.d.ts.map