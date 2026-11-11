"use strict";
/**
 * Table technical settings (SE13, DDIC object type TABL/DTT) — buffering, size
 * category, data class, logging.
 *
 * WHY IN-REPO: the dep has no wrapper, and the collection is not advertised
 * under any name resembling "buffering" — it is
 * `/sap/bc/adt/ddic/db/settings` with the title "Technical Table Settings",
 * media type `application/vnd.sap.adt.table.settings.v2+xml`. Found by scanning
 * every advertised collection TITLE in the live discovery document, and
 * confirmed by the `Technical Settings` atom:link that every table object
 * carries.
 *
 * Like a missing index, missing buffering never raises an error — a config table
 * read on every call just goes to the database every time.
 *
 * THE VALUE MAPPING WAS GROUND-TRUTHED AGAINST DD09L, not assumed. Read the ADT
 * settings and DD09L for the same tables on DM2/310:
 *
 *   ts:buffering/allowed  ts:buffering/type  DD09L-PUFFERUNG  SE13
 *   --------------------  -----------------  ---------------  ----------------------------
 *   N                     (empty)            ''               Buffering not allowed
 *   X                     (empty)            ''               Allowed but switched off
 *   X                     X                  'X'              Fully buffered      (TOBJ)
 *   X                     P                  'P'              Single-record       (T100)
 *   X                     G                  'G'              Generic             (many)
 *
 *   ts:loggingEnabled true  <-> DD09L-PROTOKOLL 'X'   (TOBJ true/X, T100 false/'')
 *   ts:dataClassCategory    <-> DD09L-TABART          (exact match on every table read)
 *   ts:sizeCategory         <-> the SE13 size category
 *
 * NOTE the two-field encoding: "buffering switched on" needs BOTH `allowed=X`
 * and a non-empty `type`. Setting only one of them is the mistake that leaves a
 * table looking configured while it is not buffered — so this module never lets
 * a caller express that state by accident.
 *
 * The write is a read-modify-write on the settings object: GET, patch only the
 * requested elements, then lock + PUT. An omitted field therefore means KEEP,
 * never "reset to default" — a table quietly losing its data class or size
 * category is exactly the sort of change nobody notices for months.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_SETTINGS_TYPE = exports.CT_TABLE_SETTINGS = void 0;
exports.tableSettingsUri = tableSettingsUri;
exports.classifyBuffering = classifyBuffering;
exports.parseTableSettings = parseTableSettings;
exports.patchTableSettings = patchTableSettings;
exports.describeBuffering = describeBuffering;
const adtObjectOps_1 = require("./adtObjectOps");
const utils_1 = require("./utils");
exports.CT_TABLE_SETTINGS = 'application/vnd.sap.adt.table.settings.v2+xml';
exports.TABLE_SETTINGS_TYPE = 'TABL/DTT';
/** ADT URI of a table's technical settings. */
function tableSettingsUri(tableName) {
    return `/sap/bc/adt/ddic/db/settings/${(0, utils_1.encodeSapObjectName)(tableName.toUpperCase()).toLowerCase()}`;
}
/** Caller-facing mode -> the two ADT elements, ground-truthed against DD09L. */
const BUFFERING_MODES = {
    not_allowed: { allowed: 'N', type: '', pufferung: '' },
    allowed_but_switched_off: { allowed: 'X', type: '', pufferung: '' },
    fully_buffered: { allowed: 'X', type: 'X', pufferung: 'X' },
    single_record: { allowed: 'X', type: 'P', pufferung: 'P' },
    generic: { allowed: 'X', type: 'G', pufferung: 'G' },
};
function tag(xml, name) {
    // Matches both <ts:x>v</ts:x> and the self-closing <ts:x/> (which means empty).
    const paired = new RegExp(`<ts:${name}>([\\s\\S]*?)</ts:${name}>`).exec(xml);
    if (paired)
        return paired[1].trim();
    return new RegExp(`<ts:${name}\\s*/>`).test(xml) ? '' : '';
}
/** Classify the allowed/type pair back into a caller-facing mode. */
function classifyBuffering(allowed, type) {
    for (const [mode, v] of Object.entries(BUFFERING_MODES)) {
        if (v.allowed === allowed && v.type === type)
            return mode;
    }
    return 'unknown';
}
/** Parse a `ts:tableSettings` document. */
function parseTableSettings(xml) {
    const doc = xml ?? '';
    const bufferingBlock = /<ts:buffering>([\s\S]*?)<\/ts:buffering>/.exec(doc)?.[1] ?? '';
    const allowed = tag(bufferingBlock, 'allowed');
    const type = tag(bufferingBlock, 'type');
    const mode = classifyBuffering(allowed, type);
    return {
        table_name: /adtcore:name="([^"]*)"/.exec(doc)?.[1] ?? '',
        description: /adtcore:description="([^"]*)"/.exec(doc)?.[1] ?? '',
        version: /adtcore:version="([^"]*)"/.exec(doc)?.[1] ?? '',
        data_class: tag(doc, 'dataClassCategory'),
        size_category: tag(doc, 'sizeCategory'),
        buffering: mode,
        buffering_allowed: allowed,
        buffering_type: type,
        generic_key_fields: tag(bufferingBlock, 'areaKeyFields'),
        storage_type: tag(doc, 'storageType'),
        logging_enabled: tag(doc, 'loggingEnabled') === 'true',
        expected_dd09l_pufferung: mode === 'unknown' ? '?' : BUFFERING_MODES[mode].pufferung,
    };
}
/**
 * Apply a patch to an existing `ts:tableSettings` document.
 *
 * Read-modify-write on the REAL document rather than building one from scratch:
 * the payload carries elements this module does not model (sharingType,
 * loadUnit, translation, supportsLoggingAssessment) and rebuilding it would
 * silently reset them.
 */
function patchTableSettings(xml, patch) {
    let out = xml;
    if (patch.buffering) {
        const mode = BUFFERING_MODES[patch.buffering];
        // areaKeyFields only means anything for generic buffering; forcing it to 0
        // otherwise keeps the document consistent with what SE13 would write.
        const keyFields = patch.buffering === 'generic'
            ? Math.max(0, Math.trunc(patch.generic_key_fields ?? 1))
            : 0;
        const block = '<ts:buffering>' +
            `<ts:allowed>${(0, adtObjectOps_1.escXml)(mode.allowed)}</ts:allowed>` +
            (mode.type ? `<ts:type>${(0, adtObjectOps_1.escXml)(mode.type)}</ts:type>` : '<ts:type/>') +
            `<ts:areaKeyFields>${keyFields}</ts:areaKeyFields>` +
            '</ts:buffering>';
        out = /<ts:buffering>[\s\S]*?<\/ts:buffering>/.test(out)
            ? out.replace(/<ts:buffering>[\s\S]*?<\/ts:buffering>/, block)
            : out.replace(/<ts:buffering\s*\/>/, block);
    }
    else if (patch.generic_key_fields !== undefined) {
        // Changing the generic key count without changing the mode.
        const keyFields = Math.max(0, Math.trunc(patch.generic_key_fields));
        out = out.replace(/<ts:areaKeyFields>[\s\S]*?<\/ts:areaKeyFields>/, `<ts:areaKeyFields>${keyFields}</ts:areaKeyFields>`);
    }
    if (patch.size_category !== undefined) {
        out = replaceSimple(out, 'sizeCategory', String(patch.size_category));
    }
    if (patch.data_class !== undefined) {
        out = replaceSimple(out, 'dataClassCategory', patch.data_class.toUpperCase());
    }
    if (patch.log_changes !== undefined) {
        out = replaceSimple(out, 'loggingEnabled', patch.log_changes ? 'true' : 'false');
    }
    return out;
}
/** Replace a simple element's text, handling the self-closing form. */
function replaceSimple(xml, name, value) {
    const paired = new RegExp(`<ts:${name}>[\\s\\S]*?</ts:${name}>`);
    if (paired.test(xml)) {
        return xml.replace(paired, `<ts:${name}>${(0, adtObjectOps_1.escXml)(value)}</ts:${name}>`);
    }
    const selfClosing = new RegExp(`<ts:${name}\\s*/>`);
    if (selfClosing.test(xml)) {
        return xml.replace(selfClosing, `<ts:${name}>${(0, adtObjectOps_1.escXml)(value)}</ts:${name}>`);
    }
    return xml;
}
/** Human-readable summary, so a response says what was actually configured. */
function describeBuffering(settings) {
    switch (settings.buffering) {
        case 'not_allowed':
            return 'buffering not allowed';
        case 'allowed_but_switched_off':
            return 'buffering allowed but switched OFF (the table is not buffered)';
        case 'fully_buffered':
            return 'fully buffered';
        case 'single_record':
            return 'single-record buffered';
        case 'generic':
            return `generic buffering on ${settings.generic_key_fields} key field(s)`;
        default:
            return `unrecognised buffering state (allowed="${settings.buffering_allowed}", type="${settings.buffering_type}")`;
    }
}
//# sourceMappingURL=tableSettingsXml.js.map