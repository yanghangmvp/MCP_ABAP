/**
 * ValidateBehaviorDefinition Handler - Validate ABAP BehaviorDefinition Name
 *
 * Uses AdtClient.validateBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { BehaviorDefinitionImplementationType } from '@mcp-abap-adt/adt-clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateBehaviorDefinitionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Validate an ABAP behavior definition name before creation. Checks if the name is valid and available. Returns validation result with success status and message. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name to validate (e.g., ZI_MY_BDEF).";
            };
            readonly root_entity: {
                readonly type: "string";
                readonly description: "Root entity name (e.g., ZI_MY_ENTITY). Required for validation.";
            };
            readonly implementation_type: {
                readonly type: "string";
                readonly description: "Implementation type: 'Managed', 'Unmanaged', 'Abstract', or 'Projection'.";
                readonly enum: readonly ["Managed", "Unmanaged", "Abstract", "Projection"];
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects). Required for validation.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "BehaviorDefinition description. Required for validation.";
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
        readonly required: readonly ["name", "root_entity", "implementation_type", "package_name", "description"];
    };
};
interface ValidateBehaviorDefinitionArgs {
    name: string;
    root_entity: string;
    implementation_type: BehaviorDefinitionImplementationType;
    package_name: string;
    description: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ValidateBehaviorDefinition MCP tool
 *
 * Uses AdtClient.validateBehaviorDefinition - low-level single method call
 */
export declare function handleValidateBehaviorDefinition(context: HandlerContext, args: ValidateBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateBehaviorDefinition.d.ts.map