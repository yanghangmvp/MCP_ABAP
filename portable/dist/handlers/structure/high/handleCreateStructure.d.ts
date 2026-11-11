/**
 * CreateStructure Handler - ABAP Structure Creation via ADT API
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> create -> lock -> check (inactive version) -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: Structure. Will be useful for creating structure. Create a new ABAP structure in SAP system. Creates the structure object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., ZZ_S_TEST_001). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Structure description. If not provided, structure_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly fields: {
                readonly type: "array";
                readonly description: "Array of structure fields";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "Field name (e.g., CLIENT, MATERIAL_ID)";
                        };
                        readonly data_type: {
                            readonly type: "string";
                            readonly description: "Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.";
                        };
                        readonly length: {
                            readonly type: "number";
                            readonly description: "Field length";
                        };
                        readonly decimals: {
                            readonly type: "number";
                            readonly description: "Decimal places (for DEC, CURR, QUAN types)";
                            readonly default: 0;
                        };
                        readonly domain: {
                            readonly type: "string";
                            readonly description: "NOT SUPPORTED for a DDL structure field and rejected with an error. A DDL structure cannot type a field directly to a domain — reach the domain through a data element instead (create a DTEL on the domain, then pass it as data_element).";
                        };
                        readonly data_element: {
                            readonly type: "string";
                            readonly description: "Data element (DTEL) to type this field with, e.g. MATNR. Takes precedence over structure_ref / table_ref / data_type.";
                        };
                        readonly structure_ref: {
                            readonly type: "string";
                            readonly description: "NESTED substructure: types this field AS another structure (emits \"<field> : <structure>;\"). This is NOT an include — use the top-level \"includes\" parameter to flatten another structure into this one.";
                        };
                        readonly table_ref: {
                            readonly type: "string";
                            readonly description: "Table type (TTYP) to type this field with, giving a nested internal table / line-item field (emits \"<field> : <tabletype>;\").";
                        };
                        readonly description: {
                            readonly type: "string";
                            readonly description: "Field description";
                        };
                    };
                    readonly required: readonly ["name"];
                };
            };
            readonly includes: {
                readonly type: "array";
                readonly description: "Include other structures in this structure";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "Include structure name";
                        };
                        readonly suffix: {
                            readonly type: "string";
                            readonly description: "Optional suffix for include fields";
                        };
                    };
                    readonly required: readonly ["name"];
                };
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate structure after creation. Default: true. Set to false for batch operations (activate multiple objects later).";
            };
        };
        readonly required: readonly ["structure_name", "package_name", "fields"];
    };
};
export interface StructureField {
    name: string;
    data_type?: string;
    length?: number;
    decimals?: number;
    domain?: string;
    data_element?: string;
    structure_ref?: string;
    table_ref?: string;
    description?: string;
}
interface StructureInclude {
    name: string;
    suffix?: string;
}
interface CreateStructureArgs {
    structure_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
    fields: StructureField[];
    includes?: StructureInclude[];
    activate?: boolean;
}
/**
 * Map one field to its DDL type expression.
 *
 * Precedence: data_element -> structure_ref -> table_ref -> data_type builtin.
 *
 * All three REFERENCE forms used to be accepted by the inputSchema and then
 * ignored by this function, which only ever looked at `data_element` and
 * `data_type`. A field passing `table_ref: "ZTT_ITEMS"` therefore fell through
 * to the `data_type` default (CHAR) and the `length` default (1) and was
 * emitted as `abap.char(1)` — and the structure ACTIVATED, so the wrong type
 * was only discoverable by reading every field back. Nested interface
 * structures (a header with a line-item table field) are exactly the case that
 * hit this, i.e. the gap swallowed the most common real usage.
 *
 * `domain` is rejected rather than ignored: a DDL structure cannot type a field
 * to a domain at all (domains are reachable only via a data element), and
 * silently degrading to `abap.char(1)` is far worse than an explicit error.
 */
export declare function ddlFieldType(field: StructureField): string;
/**
 * Build DDIC structure DDL from the requested fields/includes.
 *
 * The `@AbapCatalog.enhancement.category` annotation is mandatory — without it
 * the DDL check fails. Field/structure names are lower-cased (SAP stores them
 * upper-case; DDL is case-insensitive).
 */
export declare function buildStructureDdl(structureName: string, description: string, fields: StructureField[], includes?: StructureInclude[]): string;
/**
 * Main handler for CreateStructure MCP tool
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreateStructure(context: HandlerContext, args: CreateStructureArgs): Promise<any>;
export {};
//# sourceMappingURL=handleCreateStructure.d.ts.map