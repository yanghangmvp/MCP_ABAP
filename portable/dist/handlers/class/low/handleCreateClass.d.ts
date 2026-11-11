/**
 * CreateClass Handler - Create ABAP Class
 *
 * Uses AdtClient.createClass from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateClassLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Create a new ABAP class. - use CreateClass (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_TEST_CLASS_001). Must follow SAP naming conventions.";
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
            readonly superclass: {
                readonly type: "string";
                readonly description: "Superclass name (optional).";
            };
            readonly final: {
                readonly type: "boolean";
                readonly description: "Mark class as final (optional, default: false).";
            };
            readonly abstract: {
                readonly type: "boolean";
                readonly description: "Mark class as abstract (optional, default: false).";
            };
            readonly create_protected: {
                readonly type: "boolean";
                readonly description: "Create protected section (optional, default: false).";
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
        readonly required: readonly ["class_name", "description", "package_name"];
    };
};
interface CreateClassArgs {
    class_name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    superclass?: string;
    final?: boolean;
    abstract?: boolean;
    create_protected?: boolean;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateClass MCP tool
 *
 * Uses AdtClient.createClass - low-level single method call
 */
export declare function handleCreateClass(context: HandlerContext, args: CreateClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateClass.d.ts.map