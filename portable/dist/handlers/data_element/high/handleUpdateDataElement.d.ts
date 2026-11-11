/**
 * UpdateDataElement Handler - Update Existing ABAP Data Element
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateDataElement";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Update, Create. Subject: DataElement. Will be useful for updating or creating data element. Update an existing ABAP data element. Locks, updates with provided parameters (complete replacement), unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name to update (e.g., ZZ_TEST_DTEL_01)";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "New data element description";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly type_kind: {
                readonly type: "string";
                readonly description: "Type kind: domain, predefinedAbapType, refToPredefinedAbapType, refToDictionaryType, refToClifType";
                readonly enum: readonly ["domain", "predefinedAbapType", "refToPredefinedAbapType", "refToDictionaryType", "refToClifType"];
                readonly default: "domain";
            };
            readonly type_name: {
                readonly type: "string";
                readonly description: "Type name: domain name, data element name, or class name (depending on type_kind)";
            };
            readonly data_type: {
                readonly type: "string";
                readonly description: "Data type (CHAR, NUMC, etc.) - for predefinedAbapType or refToPredefinedAbapType";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "Length - for predefinedAbapType or refToPredefinedAbapType";
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "Decimals - for predefinedAbapType or refToPredefinedAbapType";
            };
            readonly field_label_short: {
                readonly type: "string";
                readonly description: "Short field label (max 10 chars)";
            };
            readonly field_label_medium: {
                readonly type: "string";
                readonly description: "Medium field label (max 20 chars)";
            };
            readonly field_label_long: {
                readonly type: "string";
                readonly description: "Long field label (max 40 chars)";
            };
            readonly field_label_heading: {
                readonly type: "string";
                readonly description: "Heading field label (max 55 chars)";
            };
            readonly search_help: {
                readonly type: "string";
                readonly description: "Search help name";
            };
            readonly search_help_parameter: {
                readonly type: "string";
                readonly description: "Search help parameter";
            };
            readonly set_get_parameter: {
                readonly type: "string";
                readonly description: "Set/Get parameter ID";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
                readonly default: true;
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
    type_kind?: string;
    type_name?: string;
    data_type?: string;
    length?: number;
    decimals?: number;
    field_label_short?: string;
    field_label_medium?: string;
    field_label_long?: string;
    field_label_heading?: string;
    search_help?: string;
    search_help_parameter?: string;
    set_get_parameter?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateDataElement tool
 *
 * Uses DataElementBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleUpdateDataElement(context: HandlerContext, args: DataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateDataElement.d.ts.map