/**
 * ValidateObject Handler - Validate ABAP object name via ADT API
 *
 * Uses validateObjectName from @mcp-abap-adt/adt-clients/core for all operations.
 * Connection management handled internally.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateObjectLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Validate an ABAP object name before creation. Checks if the name is valid and available. Returns validation result with success status and message. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name to validate (e.g., ZCL_MY_CLASS, Z_MY_PROGRAM, ZIF_MY_INTERFACE)";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type: 'class', 'program', 'interface', 'function_group', 'table', 'structure', 'view', 'domain', 'data_element', 'package', 'behavior_definition', 'behavior_implementation', 'metadata_extension'";
                readonly enum: readonly ["class", "program", "interface", "function_group", "table", "structure", "view", "domain", "data_element", "package", "behavior_definition", "behavior_implementation", "metadata_extension"];
            };
            readonly behavior_definition: {
                readonly type: "string";
                readonly description: "Optional behavior definition name (required for behavior_implementation validation)";
            };
            readonly root_entity: {
                readonly type: "string";
                readonly description: "Root entity name (required for behavior_definition validation)";
            };
            readonly implementation_type: {
                readonly type: "string";
                readonly description: "Implementation type: 'Managed', 'Unmanaged', or 'External' (required for behavior_definition validation)";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Optional package name for validation";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description for validation";
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
        readonly required: readonly ["object_name", "object_type"];
    };
};
interface ValidateObjectArgs {
    object_name: string;
    object_type: string;
    package_name?: string;
    description?: string;
    behavior_definition?: string;
    root_entity?: string;
    implementation_type?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ValidateObject MCP tool
 *
 * Uses validateObjectName from @mcp-abap-adt/adt-clients/core for all operations
 * Connection management handled internally
 */
export declare function handleValidateObject(context: HandlerContext, args: ValidateObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateObject.d.ts.map