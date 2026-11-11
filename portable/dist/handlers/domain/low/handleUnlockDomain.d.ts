/**
 * UnlockDomain Handler - Unlock ABAP Domain
 *
 * Uses AdtClient.unlockDomain from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockDomainLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP domain after modification. Requires the lock_handle from LockDomain operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockDomain operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockDomain operation. Must be the same as used in LockDomain.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockDomain (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["domain_name", "lock_handle"];
    };
};
interface UnlockDomainArgs {
    domain_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockDomain MCP tool
 *
 * Uses AdtClient.unlockDomain - low-level single method call
 */
export declare function handleUnlockDomain(context: HandlerContext, args: UnlockDomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockDomain.d.ts.map