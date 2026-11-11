/**
 * UnlockStructure Handler - Unlock ABAP Structure
 *
 * Uses AdtClient.unlockStructure from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockStructureLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP structure after modification. Requires the lock_handle from LockStructure operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockStructure operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockStructure operation. Must be the same as used in LockStructure.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockStructure (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["structure_name", "lock_handle"];
    };
};
interface UnlockStructureArgs {
    structure_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockStructure MCP tool
 *
 * Uses AdtClient.unlockStructure - low-level single method call
 */
export declare function handleUnlockStructure(context: HandlerContext, args: UnlockStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockStructure.d.ts.map