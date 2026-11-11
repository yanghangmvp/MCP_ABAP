/**
 * ActivateDomain Handler - Activate ABAP Domain
 *
 * Uses AdtClient.activateDomain from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateDomainLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Activate, Create, Update. Subject: Domain. Will be useful for activating, creating, or updating domain. [low-level] Activate an ABAP domain. Returns activation status and any warnings/errors. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., ZDM_MY_DOMAIN).";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["domain_name"];
    };
};
interface ActivateDomainArgs {
    domain_name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ActivateDomain MCP tool
 *
 * Uses AdtClient.activateDomain - low-level single method call
 */
export declare function handleActivateDomain(context: HandlerContext, args: ActivateDomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateDomain.d.ts.map