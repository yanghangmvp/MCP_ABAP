/**
 * UpdateBehaviorDefinition Handler - Update ABAP Behavior Definition Source Code
 *
 * Uses AdtClient.updateBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateBehaviorDefinitionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Update source code of an existing ABAP behavior definition. Requires lock handle from LockObject. - use UpdateBehaviorDefinition (high-level) for full workflow with lock/unlock/activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Behavior definition name (e.g., ZOK_C_TEST_0001). Behavior definition must already exist.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete behavior definition source code.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockObject. Required for update operation.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
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
        readonly required: readonly ["name", "source_code", "lock_handle"];
    };
};
interface UpdateBehaviorDefinitionArgs {
    name: string;
    source_code: string;
    lock_handle: string;
    transport_request?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UpdateBehaviorDefinition MCP tool
 *
 * Uses AdtClient.updateBehaviorDefinition - low-level single method call
 */
export declare function handleUpdateBehaviorDefinition(context: HandlerContext, args: UpdateBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateBehaviorDefinition.d.ts.map