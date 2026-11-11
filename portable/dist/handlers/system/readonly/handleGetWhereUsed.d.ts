/**
 * WhereUsed handler using AdtClient utilities
 * Endpoint: /sap/bc/adt/repository/informationsystem/usageReferences
 * Uses getWhereUsedList for parsed results
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetWhereUsed";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Search where-used references — find all objects that reference or depend on a given ABAP object. Answers: \"where is X used\", \"who calls X\", \"what depends on X\", \"show usages of X\". Returns referencing objects with types and packages. Covers classes, interfaces, programs, includes, function groups/modules, packages, tables, structures, TABLE TYPES, domains, data elements, CDS views, classic views, service definitions/bindings, behavior definitions, metadata extensions, message classes, lock objects and transformations. Types not in that list are rejected with the supported list; for the types SAP itself cannot answer for, the error comes from SAP.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Name of the ABAP object. For function modules the name MUST be in the form 'GROUP|FM_NAME' (function group name, pipe, function module name).";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Type of the ABAP object. Case-insensitive; either a human alias or an ADT type code. 'class'/'clas/oc', 'interface'/'intf/if', 'program'/'prog/p', 'include', 'function'/'functiongroup'/'fugr', 'functionmodule'/'function_module'/'fugr/ff' (object_name must be 'GROUP|FM_NAME'), 'package'/'devc/k', 'table'/'tabl/dt', 'structure'/'stru/dt', 'table_type'/'tabletype'/'ttyp'/'ttyp/da', 'domain'/'doma/dd', 'data_element'/'dtel', 'view'/'cds_view'/'ddls/df' (CDS DDL source), 'classic_view'/'view/dv', 'service_definition'/'srvd', 'service_binding'/'srvb', 'behavior_definition'/'bdef', 'metadata_extension'/'ddlx', 'message_class'/'msag', 'lock_object'/'enqu', 'xslt'/'transformation'. An unknown value throws an error listing the supported types.";
            };
            readonly enable_all_types: {
                readonly type: "boolean";
                readonly description: "If true, expands the scope to all available object types (Eclipse 'select all' behavior) by flipping every isSelected flag in the scope XML. Default: false (SAP default scope). Note: on large systems this can make the search significantly slower.";
                readonly default: false;
            };
        };
        readonly required: readonly ["object_name", "object_type"];
    };
};
interface WhereUsedArgs {
    object_name: string;
    object_type: string;
    enable_all_types?: boolean;
}
/**
 * Returns where-used references for ABAP objects using AdtClient utilities.
 * Uses getWhereUsedList for parsed structured results.
 */
export declare function handleGetWhereUsed(context: HandlerContext, args: WhereUsedArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        json: {
            object_name: string;
            object_type: string;
            enable_all_types: boolean;
            total_references: number;
            references: {
                name: any;
                type: any;
                uri: any;
                package_name: any;
                usage_information: any;
            }[];
        };
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetWhereUsed.d.ts.map