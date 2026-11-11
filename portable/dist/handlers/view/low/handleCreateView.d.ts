/**
 * CreateView Handler - Create ABAP View
 *
 * Uses AdtClient.createView from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateViewLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Create a new ABAP view. - use CreateView (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., Z_TEST_PROGRAM). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "View description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly view_type: {
                readonly type: "string";
                readonly description: "View type: 'executable', 'include', 'module_pool', 'function_group', 'class_pool', 'interface_pool' (optional).";
            };
            readonly application: {
                readonly type: "string";
                readonly description: "Application area (optional, default: '*').";
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
        readonly required: readonly ["view_name", "description", "package_name"];
    };
};
interface CreateViewArgs {
    view_name: string;
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
 * Main handler for CreateView MCP tool
 *
 * Uses AdtClient.createView - low-level single method call
 */
export declare function handleCreateView(context: HandlerContext, args: CreateViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateView.d.ts.map