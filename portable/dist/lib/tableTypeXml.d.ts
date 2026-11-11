/**
 * Robust read-modify-write helpers for ABAP Table Type (TTYP) XML.
 *
 * Background / why this exists
 * ----------------------------
 * A table type is created with a *bare* POST (root element + packageRef only),
 * so the fresh object has no `<ttyp:rowType>` / `<ttyp:accessType>` /
 * `<ttyp:primaryKey>` nodes yet. The row type — the whole point of a table type
 * — has to be written with a follow-up PUT.
 *
 * `@mcp-abap-adt/adt-clients` writes it with a regex patch
 * (`patchTableTypeXml` → `patchXmlElement`), which is `xml.replace(...)` against
 * a tag that must ALREADY EXIST. On a freshly created table type the tags are
 * absent, so every replace silently no-ops and the row type is dropped — the
 * exact same failure mode that was fixed for domains (see ./domainXml.ts).
 *
 * These helpers parse the XML, INSERT the required nodes when missing, set the
 * requested values, and serialize the document back, preserving everything the
 * server returned that we do not touch.
 *
 * Structure confirmed against a live system (SAP_BASIS 7.56, read of
 * STRING_TABLE via /sap/bc/adt/ddic/tabletypes/string_table):
 *
 *   <ttyp:tableType adtcore:description="..." adtcore:name="..." adtcore:type="TTYP/DA">
 *     <adtcore:packageRef adtcore:name="..."/>
 *     <ttyp:rowType>
 *       <ttyp:typeKind>predefinedAbapType</ttyp:typeKind>
 *       <ttyp:typeName/>
 *       <ttyp:builtInType>
 *         <ttyp:dataType>STRING</ttyp:dataType>
 *         <ttyp:length>0</ttyp:length>
 *         <ttyp:decimals>0</ttyp:decimals>
 *       </ttyp:builtInType>
 *       <ttyp:rangeType/>
 *     </ttyp:rowType>
 *     <ttyp:initialRowCount>0</ttyp:initialRowCount>
 *     <ttyp:accessType>standard</ttyp:accessType>
 *     <ttyp:primaryKey>
 *       <ttyp:definition>standard</ttyp:definition>
 *       <ttyp:kind>nonUnique</ttyp:kind>
 *     </ttyp:primaryKey>
 *   </ttyp:tableType>
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
/**
 * Accept for reading/writing a table type.
 *
 * The SINGULAR `...adt.tabletype.v1+xml` first, because that is what the live
 * discovery advertises for /sap/bc/adt/ddic/tabletypes and the only type this
 * resource can actually produce. The dep's constant lists ONLY the plural
 * `...adt.tabletypes.v2/v1+xml` (plus blues.v1) — probed live, every plural
 * media type answers 415 Unsupported Media Type on a write and makes a read
 * answer 406 Not Acceptable, so a plural-only Accept broke the whole flow. The
 * plural forms are kept AFTER the singular one for releases that do serve them:
 * the server picks whichever it can produce.
 */
export declare const ACCEPT_TABLE_TYPE = "application/vnd.sap.adt.tabletype.v1+xml, application/vnd.sap.adt.tabletypes.v2+xml, application/vnd.sap.adt.tabletypes.v1+xml";
export declare const CT_TABLE_TYPE = "application/vnd.sap.adt.tabletype.v1+xml";
/**
 * How the row type is specified. Values are SAP's own value-help keys, read
 * from `ttyp:valueHelps/ttyp:typeKindValues` on a live system.
 */
export type TableTypeRowKind = 'dictionaryType' | 'predefinedAbapType' | 'refToPredefinedAbapType' | 'refToDictionaryType' | 'refToClassOrInterfaceType' | 'rangeTypeOnPredefinedType' | 'rangeTypeOnDataelement';
export type TableTypeAccess = 'standard' | 'sorted' | 'hashed' | 'index' | 'notSpecified';
export type TableTypeKeyDefinition = 'standard' | 'rowType' | 'keyComponents' | 'notSpecified';
export type TableTypeKeyKind = 'unique' | 'nonUnique' | 'notSpecified';
export declare const TABLE_TYPE_ROW_KINDS: readonly TableTypeRowKind[];
export declare const TABLE_TYPE_ACCESS_TYPES: readonly TableTypeAccess[];
export declare const TABLE_TYPE_KEY_DEFINITIONS: readonly TableTypeKeyDefinition[];
export declare const TABLE_TYPE_KEY_KINDS: readonly TableTypeKeyKind[];
export interface TableTypeContentPatch {
    description?: string;
    /** Row type name — a structure/table/data element, or an ABAP builtin. */
    row_type_name?: string;
    row_type_kind?: TableTypeRowKind;
    /** Only for predefinedAbapType / refToPredefinedAbapType row kinds. */
    built_in_type?: {
        data_type: string;
        length?: number;
        decimals?: number;
    };
    access_type?: TableTypeAccess;
    primary_key_definition?: TableTypeKeyDefinition;
    primary_key_kind?: TableTypeKeyKind;
    /**
     * Component names for `primary_key_definition: 'keyComponents'`.
     *
     * Without these the enum value can never succeed: SAP accepts the create and
     * then refuses to activate with `[E] Key components are not defined`, leaving
     * an inactive shell behind. The element shape is SAP's own, read from
     * FSBP_TP02_STY (a sorted type keyed on one component):
     *
     *   <ttyp:components ttyp:isVisible="true">
     *     <ttyp:component ttyp:name="TITLE_LET"/>
     *   </ttyp:components>
     */
    key_components?: string[];
    initial_row_count?: number;
}
/**
 * Apply the requested changes to a table type XML document, INSERTING the
 * rowType / accessType / primaryKey nodes when they are missing (which is the
 * case for every freshly created table type). Only explicitly provided fields
 * are touched.
 */
export declare function patchTableTypeContent(currentXml: string, patch: TableTypeContentPatch): string;
/** ADT URI of a table type. */
export declare function tableTypeUri(tableTypeName: string): string;
/**
 * Write table type content via read-modify-write against the ADT table type
 * endpoint. The object must already be locked (pass the lock handle).
 */
export declare function writeTableTypeContent(connection: IAbapConnection, tableTypeName: string, patch: TableTypeContentPatch, lockHandle: string, transportRequest?: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
/**
 * Build the bare create body for a new table type (root + packageRef only).
 * The row type is written afterwards by {@link writeTableTypeContent}.
 */
export declare function buildTableTypeCreateXml(params: {
    name: string;
    packageName: string;
    description?: string;
    masterLanguage?: string;
    masterSystem?: string;
    responsible?: string;
}): string;
//# sourceMappingURL=tableTypeXml.d.ts.map