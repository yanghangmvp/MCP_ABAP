/**
 * LockFunctionModule Handler - Lock ABAP Function Module
 *
 * Uses AdtClient.lockFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "LockFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Lock an ABAP function module for modification. Returns lock handle that must be used in subsequent update/unlock operations with the same session_id.";
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
        readonly required: readonly ["function_module_name", "function_group_name"];
    };
};
interface LockFunctionModuleArgs {
    function_module_name: string;
    function_group_name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for LockFunctionModule MCP tool
 *
 * Uses AdtClient.lockFunctionModule - low-level single method call
 */
export declare function handleLockFunctionModule(context: HandlerContext, args: LockFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleLockFunctionModule.d.ts.map