/**
 * CreateProgram Handler - Create ABAP Program
 *
 * Uses AdtClient.createProgram from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateProgramLow";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "[low-level] Create a new ABAP program. - use CreateProgram (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., Z_TEST_PROGRAM). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Program description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly program_type: {
                readonly type: "string";
                readonly description: "Program type: 'executable', 'include', 'module_pool', 'function_group', 'class_pool', 'interface_pool' (optional).";
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
        readonly required: readonly ["program_name", "description", "package_name"];
    };
};
interface CreateProgramArgs {
    program_name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    program_type?: string;
    application?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateProgram MCP tool
 *
 * Uses AdtClient.createProgram - low-level single method call
 */
export declare function handleCreateProgram(context: HandlerContext, args: CreateProgramArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateProgram.d.ts.map