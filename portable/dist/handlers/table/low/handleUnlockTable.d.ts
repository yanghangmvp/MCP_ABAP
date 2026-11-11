/**
 * UnlockTable Handler - Unlock ABAP Table
 *
 * Uses AdtClient.unlockTable from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockTableLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP table after modification. Must use the same session_id and lock_handle from LockTable operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockTable operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockTable operation. Must be the same as used in LockTable.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockTable (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["table_name", "lock_handle", "session_id"];
    };
};
interface UnlockTableArgs {
    table_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockTable MCP tool
 *
 * Uses AdtClient.unlockTable - low-level single method call
 */
export declare function handleUnlockTable(context: HandlerContext, args: UnlockTableArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockTable.d.ts.map