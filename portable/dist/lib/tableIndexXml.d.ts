/**
 * Table secondary indexes (SE11 "Indexes", DDIC object type TABL/DTI).
 *
 * WHY IN-REPO: the adt-clients dep has no wrapper for indexes at all, and until
 * now there was no way through this MCP to create one — or even to find out
 * whether a table HAS one, since DD12L is not exposed by the ADT Data Preview.
 * A missing index never raises an error; it only makes a job slower, which is
 * close to impossible to attribute months later. So the read tool matters as
 * much as the write one.
 *
 * THE CONTRACT, read live from /sap/bc/adt/discovery and from SAP's own indexes
 * on DM2/310 (S/4HANA 2023 FPS02):
 *
 *   collection   /sap/bc/adt/ddic/db/indexes
 *   media type   application/vnd.sap.adt.blues.v1+xml   (metadata)
 *   object URI   /sap/bc/adt/ddic/db/indexes/{table}~{id}   ('~' is %7e)
 *   source URI   {object}/source/main                    (application/JSON)
 *   templates    {object_name}{?corrNr,lockHandle,version,accessMode,_action}
 *
 * The metadata is a `blue:blueSource`; the FIELD LIST lives in the JSON source,
 * whose schema is SAP's own published `tabl/indx-v1.json`:
 *
 *   { "formatVersion": "1",
 *     "header": { "description": "...", "originalLanguage": "en" },
 *     "uniqueIndex": false, "bufferIndexOnly": false, "textIndex": false,
 *     "indexFields": [ { "fieldName": "MANDT" } ] }
 *
 * `bufferIndexOnly` is SAP's "index not on the database, only for the ABAP table
 * buffer" flag (DD12L-DBINDEX territory); `uniqueIndex` is UNIQUEFLAG.
 *
 * TWO OPERATIONAL FACTS that cost a probe each and shape the handlers:
 *
 *  1. AN INDEX WITH NO FIELDS BLOCKS ITS TABLE'S ACTIVATION —
 *     `[E] Index ZMCP_IDXPROBE-VER does not contain fields` was enough to make
 *     the TABLE fail to activate. So the field list must be written before
 *     anything is activated, and a half-created index is not merely untidy, it
 *     breaks the table.
 *  2. THE INDEX AND ITS TABLE MUST BE ACTIVATED TOGETHER. Activating the index
 *     alone fails with `Table ... is not active in ABAP Dictionary`, and
 *     activating the table alone fails on the empty index. Passing both object
 *     references in one activation call succeeds.
 */
export declare const CT_TABLE_INDEX = "application/vnd.sap.adt.blues.v1+xml";
export declare const TABLE_INDEX_TYPE = "TABL/DTI";
/** The index source is JSON, not DDL — the atom:link advertises application/json. */
export declare const CT_TABLE_INDEX_SOURCE = "application/json";
export interface TableIndexField {
    fieldName: string;
}
export interface TableIndexSource {
    formatVersion: string;
    header: {
        description: string;
        originalLanguage: string;
        abapLanguageVersion?: string;
    };
    uniqueIndex: boolean;
    bufferIndexOnly: boolean;
    textIndex: boolean;
    indexFields: TableIndexField[];
}
/**
 * ADT object name of an index: `TABLE~ID`. SE11 index ids are at most 3
 * characters.
 */
export declare function tableIndexName(tableName: string, indexId: string): string;
/** ADT URI of an index. The tilde must be percent-encoded. */
export declare function tableIndexUri(tableName: string, indexId: string): string;
/** ADT URI of the index's owning table, needed for the joint activation. */
export declare function tableUri(tableName: string): string;
export interface TableIndexCreateParams {
    tableName: string;
    indexId: string;
    packageName: string;
    description?: string;
    masterLanguage?: string;
    masterSystem?: string;
    responsible?: string;
}
/**
 * Build the index create body. Every interpolated value is ESCAPED — an
 * unescaped description is what makes SAP answer a blanket
 * "Data is invalid and could not be converted".
 */
export declare function buildTableIndexCreateXml(params: TableIndexCreateParams): string;
/**
 * Build the JSON source that carries the field list.
 *
 * Field names are upper-cased and de-duplicated in order: a duplicate column in
 * an index is rejected by SAP, and silently sending one produces an activation
 * failure that reads like a schema problem.
 */
export declare function buildTableIndexSource(params: {
    description: string;
    fields: string[];
    unique?: boolean;
    bufferIndexOnly?: boolean;
    textIndex?: boolean;
    originalLanguage?: string;
}): string;
/** Parse an index's JSON source, tolerating a body that is already an object. */
export declare function parseTableIndexSource(raw: unknown): TableIndexSource | null;
export interface TableIndexListEntry {
    index_id: string;
    name: string;
    uri: string;
    description: string;
}
export declare function parseTableIndexNodes(xml: string): TableIndexListEntry[];
//# sourceMappingURL=tableIndexXml.d.ts.map