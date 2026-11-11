/**
 * UnlockDataElement Handler - Unlock ABAP DataElement
 *
 * Uses AdtClient.unlockDataElement from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockDataElementLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP data element after modification. Requires the lock_handle from LockDataElement operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "DataElement name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockDataElement operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockDataElement operation. Must be the same as used in LockDataElement.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockDataElement (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["data_element_name", "lock_handle"];
    };
};
interface UnlockDataElementArgs {
    data_element_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockDataElement MCP tool
 *
 * Uses AdtClient.unlockDataElement - low-level single method call
 */
export declare function handleUnlockDataElement(context: HandlerContext, args: UnlockDataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockDataElement.d.ts.map