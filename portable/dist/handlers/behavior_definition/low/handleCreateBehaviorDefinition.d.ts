/**
 * CreateBehaviorDefinition Handler - Create ABAP Behavior Definition
 *
 * Uses AdtClient.createBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { BehaviorDefinitionImplementationType } from '@mcp-abap-adt/adt-clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateBehaviorDefinitionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP Behavior Definition. - use CreateBehaviorDefinition (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Behavior Definition name (e.g., ZI_MY_BDEF).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Behavior Definition description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required.";
            };
            readonly root_entity: {
                readonly type: "string";
                readonly description: "Root entity name (e.g., ZI_MY_ENTITY).";
            };
            readonly implementation_type: {
                readonly type: "string";
                readonly description: "Implementation type: 'Managed', 'Unmanaged', 'Abstract', or 'Projection'.";
                readonly enum: readonly ["Managed", "Unmanaged", "Abstract", "Projection"];
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
        readonly required: readonly ["name", "description", "package_name", "root_entity", "implementation_type"];
    };
};
interface CreateBehaviorDefinitionArgs {
    name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    root_entity: string;
    implementation_type: BehaviorDefinitionImplementationType;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateBehaviorDefinition MCP tool
 *
 * Uses AdtClient.createBehaviorDefinition - low-level single method call
 */
export declare function handleCreateBehaviorDefinition(context: HandlerContext, args: CreateBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateBehaviorDefinition.d.ts.map