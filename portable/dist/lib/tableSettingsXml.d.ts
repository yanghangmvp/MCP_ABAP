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
export declare const CT_TABLE_SETTINGS = "application/vnd.sap.adt.table.settings.v2+xml";
export declare const TABLE_SETTINGS_TYPE = "TABL/DTT";
/** ADT URI of a table's technical settings. */
export declare function tableSettingsUri(tableName: string): string;
/** The buffering states a caller can ask for, in SE13's own terms. */
export type BufferingMode = 'not_allowed' | 'allowed_but_switched_off' | 'fully_buffered' | 'single_record' | 'generic';
export interface TableSettings {
    table_name: string;
    description: string;
    version: string;
    data_class: string;
    size_category: string;
    /** The caller-facing mode, derived from the allowed/type pair. */
    buffering: BufferingMode | 'unknown';
    buffering_allowed: string;
    buffering_type: string;
    /** Number of generic key fields; only meaningful for `generic`. */
    generic_key_fields: string;
    storage_type: string;
    logging_enabled: boolean;
    /** DD09L-PUFFERUNG this state corresponds to, for an independent check. */
    expected_dd09l_pufferung: string;
}
/** Classify the allowed/type pair back into a caller-facing mode. */
export declare function classifyBuffering(allowed: string, type: string): BufferingMode | 'unknown';
/** Parse a `ts:tableSettings` document. */
export declare function parseTableSettings(xml: string): TableSettings;
export interface TableSettingsPatch {
    buffering?: BufferingMode;
    generic_key_fields?: number;
    size_category?: number | string;
    data_class?: string;
    log_changes?: boolean;
}
/**
 * Apply a patch to an existing `ts:tableSettings` document.
 *
 * Read-modify-write on the REAL document rather than building one from scratch:
 * the payload carries elements this module does not model (sharingType,
 * loadUnit, translation, supportsLoggingAssessment) and rebuilding it would
 * silently reset them.
 */
export declare function patchTableSettings(xml: string, patch: TableSettingsPatch): string;
/** Human-readable summary, so a response says what was actually configured. */
export declare function describeBuffering(settings: TableSettings): string;
//# sourceMappingURL=tableSettingsXml.d.ts.map