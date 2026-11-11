/**
 * ValidateDataElement Handler - Validate ABAP DataElement Name
 *
 * Uses AdtClient.validateDataElement from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateDataElementLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Validate an ABAP data element name before creation. Checks if the name is valid and available. Returns validation result with success status and message. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "DataElement name to validate (e.g., Z_MY_PROGRAM).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects). Required for validation.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "DataElement description. Required for validation.";
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
        readonly required: readonly ["data_element_name", "package_name", "description"];
    };
};
interface ValidateDataElementArgs {
    data_element_name: string;
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
 * Main handler for ValidateDataElement MCP tool
 *
 * Uses AdtClient.validateDataElement - low-level single method call
 */
export declare function handleValidateDataElement(context: HandlerContext, args: ValidateDataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateDataElement.d.ts.map