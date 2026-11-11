/**
 * UnlockMetadataExtension Handler - Unlock ABAP MetadataExtension
 *
 * Uses AdtClient.unlockMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockMetadataExtensionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP metadata extension after modification. Requires the lock_handle from LockMetadataExtension operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "MetadataExtension name (e.g., ZI_MY_DDLX).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockMetadataExtension operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockMetadataExtension operation. Must be the same as used in LockMetadataExtension.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockMetadataExtension (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
interface UnlockMetadataExtensionArgs {
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
 * Main handler for UnlockMetadataExtension MCP tool
 *
 * Uses AdtClient.unlockMetadataExtension - low-level single method call
 */
export declare function handleUnlockMetadataExtension(context: HandlerContext, args: UnlockMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockMetadataExtension.d.ts.map