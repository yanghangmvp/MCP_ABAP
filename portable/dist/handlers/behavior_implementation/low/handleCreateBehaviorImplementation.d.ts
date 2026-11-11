/**
 * CreateBehaviorImplementation Handler - Create ABAP Behavior Implementation Class
 *
 * Uses AdtClient.createBehaviorImplementation from @mcp-abap-adt/adt-clients.
 * Low-level handler: full workflow (create, lock, update main source, update implementations, unlock, activate).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateBehaviorImplementationLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP behavior implementation class with full workflow (create, lock, update main source, update implementations, unlock, activate). - use CreateBehaviorImplementation (high-level) for additional validation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Behavior Implementation class name (e.g., ZBP_MY_ENTITY). Must follow SAP naming conventions.";
            };
            readonly behavior_definition: {
                readonly type: "string";
                readonly description: "Behavior Definition name (e.g., ZI_MY_ENTITY). Required.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Class description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly implementation_code: {
                readonly type: "string";
                readonly description: "Implementation code for the implementations include (optional).";
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
        readonly required: readonly ["class_name", "behavior_definition", "description", "package_name"];
    };
};
interface CreateBehaviorImplementationArgs {
    class_name: string;
    behavior_definition: string;
    description: string;
    package_name: string;
    transport_request?: string;
    implementation_code?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateBehaviorImplementation MCP tool
 *
 * Uses AdtClient.createBehaviorImplementation - full workflow
 */
export declare function handleCreateBehaviorImplementation(context: HandlerContext, args: CreateBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateBehaviorImplementation.d.ts.map