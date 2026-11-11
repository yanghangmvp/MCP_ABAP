/**
 * UnlockBehaviorDefinition Handler - Unlock ABAP Behavior Definition
 *
 * Uses AdtClient.unlockBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockBehaviorDefinitionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP behavior definition after modification. Requires the lock_handle from LockBehaviorDefinition operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name (e.g., ZI_MY_BDEF).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockBehaviorDefinition operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockBehaviorDefinition operation. Must be the same as used in LockBehaviorDefinition.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockBehaviorDefinition (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["name", "lock_handle"];
    };
};
interface UnlockBehaviorDefinitionArgs {
    name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockBehaviorDefinition MCP tool
 *
 * Uses AdtClient.unlockBehaviorDefinition - low-level single method call
 */
export declare function handleUnlockBehaviorDefinition(context: HandlerContext, args: UnlockBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockBehaviorDefinition.d.ts.map