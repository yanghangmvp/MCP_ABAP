/**
 * CreateDataElement Handler - Create ABAP DataElement
 *
 * Uses AdtClient.createDataElement from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateDataElementLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP data element. - use CreateDataElement (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "DataElement name (e.g., Z_TEST_PROGRAM). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "DataElement description.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly data_type: {
                readonly type: "string";
                readonly description: "Data type (e.g., CHAR, NUMC) or domain name when type_kind is 'E' or 'domain'.";
            };
            readonly type_kind: {
                readonly type: "string";
                readonly description: "Type kind: 'E' for domain-based, 'P' for predefined type, etc.";
            };
            readonly type_name: {
                readonly type: "string";
                readonly description: "Type name: domain name (when type_kind is 'domain'), data element name (when type_kind is 'refToDictionaryType'), or class name (when type_kind is 'refToClifType')";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "Data type length (for predefinedAbapType or refToPredefinedAbapType)";
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "Decimal places (for predefinedAbapType or refToPredefinedAbapType)";
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
        readonly required: readonly ["data_element_name", "description", "package_name"];
    };
};
interface CreateDataElementArgs {
    data_element_name: string;
    description: string;
    package_name: string;
    transport_request?: string;
    data_type?: string;
    type_kind?: string;
    type_name?: string;
    length?: number;
    decimals?: number;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreateDataElement MCP tool
 *
 * Uses AdtClient.createDataElement - low-level single method call
 */
export declare function handleCreateDataElement(context: HandlerContext, args: CreateDataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateDataElement.d.ts.map