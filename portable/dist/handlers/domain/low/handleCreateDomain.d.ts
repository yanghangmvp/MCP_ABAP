/**
 * CreateDomain Handler - Create ABAP Domain
 *
 * Uses AdtClient.createDomain from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateDomainLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP domain. - use CreateDomain (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., Z_TEST_PROGRAM). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Domain description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
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
        readonly required: readonly ["domain_name", "description", "package_name"];
    };
};
interface CreateDomainArgs {
    domain_name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateDomain MCP tool
 *
 * Uses AdtClient.createDomain - low-level single method call
 */
export declare function handleCreateDomain(context: HandlerContext, args: CreateDomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateDomain.d.ts.map