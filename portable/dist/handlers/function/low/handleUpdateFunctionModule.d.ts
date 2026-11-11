/**
 * UpdateFunctionModule Handler - Update ABAP Function Module Source Code
 *
 * Uses AdtClient.updateFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Update source code of an existing ABAP function module. Requires lock handle from LockObject and function group name. - use UpdateFunctionModule (high-level) for full workflow with lock/unlock/activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_TEST_FM). Function module must already exist.";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name containing the function module (e.g., Z_TEST_FG).";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete ABAP function module source code.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects locked in a request.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockFunctionModule. Required for update operation.";
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
        readonly required: readonly ["function_module_name", "function_group_name", "source_code", "lock_handle"];
    };
};
interface UpdateFunctionModuleArgs {
    function_module_name: string;
    function_group_name: string;
    source_code: string;
    transport_request?: string;
    lock_handle: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UpdateFunctionModule MCP tool
 *
 * Uses AdtClient.updateFunctionModule - low-level single method call
 */
export declare function handleUpdateFunctionModule(context: HandlerContext, args: UpdateFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateFunctionModule.d.ts.map