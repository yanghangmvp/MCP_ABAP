/**
 * CreateTableType Handler — create an ABAP table type (TTYP).
 *
 * Table types had NO create tool at all: the Create* family covered
 * DOMA/DTEL/TABL/STRU/VIEW and friends, the compact `HandlerCreate` object_type
 * enum omitted TTYP, and `/sap/bc/adt/ddic/tabletypes` was only ever read (by
 * GetTypeInfo / GetWhereUsed). Consequence: any interface structure carrying
 * line items — a header with a nested item table — could not be built at all.
 *
 * The full flow here is: bare POST → lock → write the row type → unlock →
 * activate (verified). Two deliberate deviations from the dep:
 *
 *  - the row type is written by `writeTableTypeContent`, not the dep's
 *    `update()`: that one regex-patches tags which must already exist, and a
 *    freshly created table type has no rowType/accessType/primaryKey nodes, so
 *    the row type was silently dropped (identical to the domain create bug);
 *  - activation goes through `activateAndEvaluate`, so `activated` reflects
 *    SAP's verdict instead of echoing the request flag.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type TableTypeAccess, type TableTypeKeyDefinition, type TableTypeKeyKind, type TableTypeRowKind } from '../../../lib/tableTypeXml';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateTableType";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: Table type (TTYP). Create a new ABAP table type — an internal-table type over a row type — and activate it. Use this for nested line-item fields: create the item table type, then reference it from a structure field via table_ref (CreateStructure). The row type is normally a structure or data element (row_type_kind=dictionaryType, the default); pass built_in_data_type instead for a table of a predefined ABAP type.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_type_name: {
                readonly type: "string";
                readonly description: "Table type name (e.g., ZTT_ORDER_ITEM). Start with Z or Y, max 30 chars.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., $TMP, ZMY_PKG).";
            };
            readonly row_type_name: {
                readonly type: "string";
                readonly description: "Row type: the DDIC object each table line has — a structure, table or data element (e.g., ZS_ORDER_ITEM). Required unless built_in_data_type is given.";
            };
            readonly row_type_kind: {
                readonly type: "string";
                readonly enum: readonly TableTypeRowKind[];
                readonly description: "How the row type is specified. Default 'dictionaryType' (a structure/table/data element). Use 'predefinedAbapType' together with built_in_data_type for a table of a built-in type (e.g., a table of STRING).";
            };
            readonly built_in_data_type: {
                readonly type: "string";
                readonly description: "Built-in ABAP type for the row (e.g., STRING, CHAR, INT4) when row_type_kind is 'predefinedAbapType' / 'refToPredefinedAbapType'. Mutually exclusive with row_type_name.";
            };
            readonly built_in_length: {
                readonly type: "number";
                readonly description: "Length for built_in_data_type (default 0).";
            };
            readonly built_in_decimals: {
                readonly type: "number";
                readonly description: "Decimals for built_in_data_type (default 0).";
            };
            readonly access_type: {
                readonly type: "string";
                readonly enum: readonly TableTypeAccess[];
                readonly description: "Table kind: 'standard' (default), 'sorted', 'hashed', 'index' or 'notSpecified'.";
            };
            readonly primary_key_definition: {
                readonly type: "string";
                readonly enum: readonly TableTypeKeyDefinition[];
                readonly description: string;
            };
            readonly key_components: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: string;
            };
            readonly primary_key_kind: {
                readonly type: "string";
                readonly enum: readonly TableTypeKeyKind[];
                readonly description: "Primary key kind: 'nonUnique' (default), 'unique' or 'notSpecified'. A hashed table requires 'unique'.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description (defaults to table_type_name). Max 60 chars.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable packages; leave empty for $TMP.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after creation. Default: true. The reported activated flag is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["table_type_name", "package_name"];
    };
};
interface CreateTableTypeArgs {
    table_type_name: string;
    package_name: string;
    row_type_name?: string;
    row_type_kind?: TableTypeRowKind;
    built_in_data_type?: string;
    built_in_length?: number;
    built_in_decimals?: number;
    access_type?: TableTypeAccess;
    primary_key_definition?: TableTypeKeyDefinition;
    primary_key_kind?: TableTypeKeyKind;
    key_components?: string[];
    description?: string;
    transport_request?: string;
    activate?: boolean;
}
export declare function handleCreateTableType(context: HandlerContext, args: CreateTableTypeArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateTableType.d.ts.map