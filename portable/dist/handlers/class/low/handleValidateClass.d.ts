/**
 * ValidateClass Handler - Validate ABAP class name via ADT API
 *
 * Uses validateClassName from @mcp-abap-adt/adt-clients/core/class for class-specific validation.
 * Supports package, description, and superclass validation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateClassLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Validate an ABAP class name before creation. Checks if the name is valid, available, and validates package, description, and superclass if provided. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name to validate (e.g., ZCL_MY_CLASS)";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name for validation (required).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description for validation (required).";
            };
            readonly superclass: {
                readonly type: "string";
                readonly description: "Optional superclass name for validation (e.g., CL_OBJECT)";
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
        readonly required: readonly ["class_name", "package_name", "description"];
    };
};
interface ValidateClassArgs {
    class_name: string;
    package_name: string;
    description: string;
    superclass?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ValidateClass MCP tool
 */
export declare function handleValidateClass(context: HandlerContext, args: ValidateClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateClass.d.ts.map