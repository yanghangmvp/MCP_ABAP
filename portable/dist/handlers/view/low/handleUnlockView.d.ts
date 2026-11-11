/**
 * UnlockView Handler - Unlock ABAP View
 *
 * Uses AdtClient.unlockView from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockViewLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP view after modification. Requires the lock_handle from LockView operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockView operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockView operation. Must be the same as used in LockView.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockView (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["view_name", "lock_handle"];
    };
};
interface UnlockViewArgs {
    view_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockView MCP tool
 *
 * Uses AdtClient.unlockView - low-level single method call
 */
export declare function handleUnlockView(context: HandlerContext, args: UnlockViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockView.d.ts.map