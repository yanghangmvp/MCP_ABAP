/**
 * CreateDataElement Handler - ABAP Data Element Creation via ADT API
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: create -> activate -> verify
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateDataElement";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: DataElement. Will be useful for creating data element. Create a new ABAP data element in SAP system. Creates the data element object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name (e.g., ZZ_E_TEST_001). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Data element description. If not provided, data_element_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly data_type: {
                readonly type: "string";
                readonly description: "Data type (e.g., CHAR, NUMC) or domain name when type_kind is 'domain'.";
                readonly default: "CHAR";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "Data type length. Usually inherited from domain.";
                readonly default: 100;
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "Decimal places. Usually inherited from domain.";
                readonly default: 0;
            };
            readonly short_label: {
                readonly type: "string";
                readonly description: "Short field label (max 10 chars). Applied during update step after creation.";
            };
            readonly medium_label: {
                readonly type: "string";
                readonly description: "Medium field label (max 20 chars). Applied during update step after creation.";
            };
            readonly long_label: {
                readonly type: "string";
                readonly description: "Long field label (max 40 chars). Applied during update step after creation.";
            };
            readonly heading_label: {
                readonly type: "string";
                readonly description: "Heading field label (max 55 chars). Applied during update step after creation.";
            };
            readonly type_kind: {
                readonly type: "string";
                readonly description: "Type kind: 'domain' (default), 'predefinedAbapType', 'refToPredefinedAbapType', 'refToDictionaryType', 'refToClifType'. If not specified, defaults to 'domain'.";
                readonly enum: readonly ["domain", "predefinedAbapType", "refToPredefinedAbapType", "refToDictionaryType", "refToClifType"];
                readonly default: "domain";
            };
            readonly type_name: {
                readonly type: "string";
                readonly description: "Type name: domain name (when type_kind is 'domain'), data element name (when type_kind is 'refToDictionaryType'), or class name (when type_kind is 'refToClifType')";
            };
            readonly search_help: {
                readonly type: "string";
                readonly description: "Search help name. Applied during update step after creation.";
            };
            readonly search_help_parameter: {
                readonly type: "string";
                readonly description: "Search help parameter. Applied during update step after creation.";
            };
            readonly set_get_parameter: {
                readonly type: "string";
                readonly description: "Set/Get parameter ID. Applied during update step after creation.";
            };
        };
        readonly required: readonly ["data_element_name", "package_name"];
    };
};
interface DataElementArgs {
    data_element_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
    data_type?: string;
    length?: number;
    decimals?: number;
    short_label?: string;
    medium_label?: string;
    long_label?: string;
    heading_label?: string;
    type_kind?: 'domain' | 'predefinedAbapType' | 'refToPredefinedAbapType' | 'refToDictionaryType' | 'refToClifType';
    type_name?: string;
    search_help?: string;
    search_help_parameter?: string;
    set_get_parameter?: string;
    activate?: boolean;
}
/**
 * Main handler for CreateDataElement MCP tool
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreateDataElement(context: HandlerContext, args: DataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateDataElement.d.ts.map