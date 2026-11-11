"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CT_TABLE_INDEX_SOURCE = exports.TABLE_INDEX_TYPE = exports.CT_TABLE_INDEX = void 0;
exports.tableIndexName = tableIndexName;
exports.tableIndexUri = tableIndexUri;
exports.tableUri = tableUri;
exports.buildTableIndexCreateXml = buildTableIndexCreateXml;
exports.buildTableIndexSource = buildTableIndexSource;
exports.parseTableIndexSource = parseTableIndexSource;
exports.parseTableIndexNodes = parseTableIndexNodes;
const adtObjectOps_1 = require("./adtObjectOps");
const utils_1 = require("./utils");
exports.CT_TABLE_INDEX = 'application/vnd.sap.adt.blues.v1+xml';
exports.TABLE_INDEX_TYPE = 'TABL/DTI';
/** The index source is JSON, not DDL — the atom:link advertises application/json. */
exports.CT_TABLE_INDEX_SOURCE = 'application/json';
/**
 * ADT object name of an index: `TABLE~ID`. SE11 index ids are at most 3
 * characters.
 */
function tableIndexName(tableName, indexId) {
    return `${tableName.toUpperCase()}~${indexId.toUpperCase()}`;
}
/** ADT URI of an index. The tilde must be percent-encoded. */
function tableIndexUri(tableName, indexId) {
    const name = tableIndexName(tableName, indexId).toLowerCase();
    // encodeSapObjectName handles namespace slashes; the '~' still needs encoding
    // because ADT's own URIs use %7e.
    return `/sap/bc/adt/ddic/db/indexes/${(0, utils_1.encodeSapObjectName)(name).replace(/~/g, '%7e')}`;
}
/** ADT URI of the index's owning table, needed for the joint activation. */
function tableUri(tableName) {
    return `/sap/bc/adt/ddic/tables/${(0, utils_1.encodeSapObjectName)(tableName.toUpperCase()).toLowerCase()}`;
}
/**
 * Build the index create body. Every interpolated value is ESCAPED — an
 * unescaped description is what makes SAP answer a blanket
 * "Data is invalid and could not be converted".
 */
function buildTableIndexCreateXml(params) {
    const name = tableIndexName(params.tableName, params.indexId);
    const lang = (params.masterLanguage || 'EN').toUpperCase();
    const description = (params.description || name).slice(0, 60);
    const masterSystemAttr = params.masterSystem
        ? ` adtcore:masterSystem="${(0, adtObjectOps_1.escXml)(params.masterSystem)}"`
        : '';
    const responsibleAttr = params.responsible
        ? ` adtcore:responsible="${(0, adtObjectOps_1.escXml)(params.responsible)}"`
        : '';
    return ('<?xml version="1.0" encoding="UTF-8"?>' +
        '<blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" ' +
        'xmlns:adtcore="http://www.sap.com/adt/core" ' +
        `adtcore:name="${(0, adtObjectOps_1.escXml)(name)}" ` +
        `adtcore:type="${exports.TABLE_INDEX_TYPE}" ` +
        `adtcore:description="${(0, adtObjectOps_1.escXml)(description)}" ` +
        `adtcore:language="${(0, adtObjectOps_1.escXml)(lang)}" ` +
        `adtcore:masterLanguage="${(0, adtObjectOps_1.escXml)(lang)}"` +
        `${masterSystemAttr}${responsibleAttr}>` +
        `<adtcore:packageRef adtcore:name="${(0, adtObjectOps_1.escXml)(params.packageName.toUpperCase())}"/>` +
        '</blue:blueSource>');
}
/**
 * Build the JSON source that carries the field list.
 *
 * Field names are upper-cased and de-duplicated in order: a duplicate column in
 * an index is rejected by SAP, and silently sending one produces an activation
 * failure that reads like a schema problem.
 */
function buildTableIndexSource(params) {
    const seen = new Set();
    const fields = [];
    for (const raw of params.fields) {
        const fieldName = String(raw || '')
            .trim()
            .toUpperCase();
        if (!fieldName || seen.has(fieldName))
            continue;
        seen.add(fieldName);
        fields.push({ fieldName });
    }
    const source = {
        formatVersion: '1',
        header: {
            description: (params.description || '').slice(0, 60),
            // SAP's schema requires a 2-char LOWERCASE language code.
            originalLanguage: (params.originalLanguage || 'en')
                .toLowerCase()
                .slice(0, 2),
        },
        uniqueIndex: params.unique === true,
        bufferIndexOnly: params.bufferIndexOnly === true,
        textIndex: params.textIndex === true,
        indexFields: fields,
    };
    return JSON.stringify(source, null, 2);
}
/** Parse an index's JSON source, tolerating a body that is already an object. */
function parseTableIndexSource(raw) {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== 'object')
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
/**
 * Extract the index children of a table from a `/repository/nodestructure`
 * response.
 *
 * This is the only way found to enumerate a table's indexes: DD12L is refused by
 * the ADT Data Preview, and the index collection's `$values` resource answers
 * 405 for GET. The nodestructure lists them as TABL/DTI children of TABL/DT.
 */
/** Decode the XML entities in element text — these come from raw regex reads. */
function decodeXmlText(text) {
    return (text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        // & last, so a literal "&amp;lt;" is not turned into "<".
        .replace(/&amp;/g, '&'));
}
function parseTableIndexNodes(xml) {
    const entries = [];
    const nodes = (xml ?? '').match(/<SEU_ADT_REPOSITORY_OBJ_NODE>[\s\S]*?<\/SEU_ADT_REPOSITORY_OBJ_NODE>/g) ?? [];
    for (const node of nodes) {
        if (!/<OBJECT_TYPE>TABL\/DTI<\/OBJECT_TYPE>/.test(node))
            continue;
        const indexId = /<OBJECT_NAME>([^<]*)<\/OBJECT_NAME>/.exec(node)?.[1] ?? '';
        const uri = /<OBJECT_URI>([^<]*)<\/OBJECT_URI>/.exec(node)?.[1] ?? '';
        const description = decodeXmlText(/<DESCRIPTION>([^<]*)<\/DESCRIPTION>/.exec(node)?.[1] ?? '');
        // TECH_NAME is "MARA      G16" — the table padded to 30, then the id.
        const techName = /<TECH_NAME>([^<]*)<\/TECH_NAME>/.exec(node)?.[1] ?? '';
        const table = techName.trim().split(/\s+/)[0] ?? '';
        if (!indexId)
            continue;
        entries.push({
            index_id: indexId,
            name: table ? `${table}~${indexId}` : indexId,
            uri,
            description,
        });
    }
    return entries;
}
//# sourceMappingURL=tableIndexXml.js.map