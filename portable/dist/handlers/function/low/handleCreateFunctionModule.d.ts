/**
 * CreateFunctionModule Handler - Create ABAP Function Module
 *
 * Uses AdtClient.createFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Create a new ABAP function module. - use CreateFunctionModule (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_MY_FUNCTION).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZFG_MY_GROUP).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Function module description.";
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
        readonly required: readonly ["function_module_name", "function_group_name", "description", "package_name"];
    };
};
interface CreateFunctionModuleArgs {
    function_module_name: string;
    function_group_name: string;
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
 * Main handler for CreateFunctionModule MCP tool
 *
 * Uses AdtClient.createFunctionModule - low-level single method call
 */
export declare function handleCreateFunctionModule(context: HandlerContext, args: CreateFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateFunctionModule.d.ts.map