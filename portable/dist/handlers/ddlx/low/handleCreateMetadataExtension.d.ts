/**
 * CreateMetadataExtension Handler - Create ABAP Metadata Extension
 *
 * Uses AdtClient.createMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateMetadataExtensionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP Metadata Extension. - use CreateMetadataExtension (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Metadata Extension name (e.g., ZI_MY_DDLX).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Metadata Extension description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Optional for local objects.";
            };
            readonly master_language: {
                readonly type: "string";
                readonly description: "Master language (optional, e.g., 'EN').";
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
        readonly required: readonly ["name", "description", "package_name"];
    };
};
interface CreateMetadataExtensionArgs {
    name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    master_language?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateMetadataExtension MCP tool
 *
 * Uses AdtClient.createMetadataExtension - low-level single method call
 */
export declare function handleCreateMetadataExtension(context: HandlerContext, args: CreateMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateMetadataExtension.d.ts.map