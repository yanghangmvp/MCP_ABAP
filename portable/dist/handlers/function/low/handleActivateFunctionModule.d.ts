/**
 * ActivateFunctionModule Handler - Activate ABAP Function Module
 *
 * Uses AdtClient.activateFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Activate, Create, Update. Subject: FunctionModule. Will be useful for activating, creating, or updating function module. [low-level] Activate an ABAP function module. Returns activation status and any warnings/errors. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_FM_TEST).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., Z_FG_TEST).";
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
interface ActivateFunctionModuleArgs {
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
 * Main handler for ActivateFunctionModule MCP tool
 *
 * Uses AdtClient.activateFunctionModule - low-level single method call
 */
export declare function handleActivateFunctionModule(context: HandlerContext, args: ActivateFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateFunctionModule.d.ts.map