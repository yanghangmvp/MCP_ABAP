"use strict";
/**
 * Does this ATC check variant actually exist?
 *
 * WHY THIS EXISTS (field report round 3, K-2).
 *
 * `POST /sap/bc/adt/atc/worklists?checkVariant=<name>` accepts ANY name. A
 * variant that does not exist gets HTTP 200, a normal worklist id, and a run
 * that silently uses the system default — while `RunAtc` echoed the caller's
 * own `check_variant` back in a field a caller reads as a verdict. The failure
 * mode is the worst kind a checker has: a typo in a variant name produces
 * "ATC run completed with no findings", and clean is the least-questioned
 * result there is.
 *
 * MEASURED ON DM2/310, comparing runs over package ZMCP_VALIDATION:
 *
 *   check_variant                findings  objects
 *   (omitted) / DEFAULT               79        8
 *   ZMY_CHECK_VARIANT              79        8
 *   CDS_RANK                           0       16
 *   ZNO_SUCH_VARIANT_XX            79        8   <- silent fallback
 *
 * `CDS_RANK` produced a different object count and a different finding count,
 * which proves the parameter is honoured FOR THAT VARIANT.
 *
 * ROUND 4 CORRECTION — that experiment did not test what it was used to claim.
 * `SCICHKV_HD` has a `CIUSER` column, and the three samples differ on it:
 *
 *   DEFAULT               CIUSER = ''          global
 *   CDS_RANK              CIUSER = ''          global
 *   ZMY_CHECK_VARIANT  CIUSER = 'SOME.USER'  USER-SCOPED
 *
 * Both variants that demonstrably worked are global; the only one that behaved
 * identically to DEFAULT is the only user-scoped one. So "this endpoint honours
 * global variants and ignores user-scoped ones" was NOT disproved — it was
 * untested. It is also still unproved: on this system exactly **1 of 502**
 * variants is user-scoped, so no second sample was available to move.
 *
 * CONSEQUENCE FOR THE GUARD, and the reason this file grew a second check: a
 * name-only lookup passes a user-scoped variant, and the run may then silently
 * be DEFAULT anyway. That is the case a project actually hits — a team's own
 * rules live in a variant that team created. So the verification reports the
 * scope, and RunAtc warns loudly instead of passing it in silence.
 *
 * WHY THE VALIDATION READS A DDIC TABLE AND NOT AN ADT ENDPOINT. Both obvious
 * candidates were probed and neither can answer the question:
 *
 *   GET /sap/bc/adt/atc/checkvariants            -> 400 uriMappingError
 *   GET /sap/bc/adt/atc/checkvariants/DEFAULT    -> 404, identical to a bogus
 *                                                   name (that endpoint only
 *                                                   serves local CHKV objects)
 *   GET /sap/bc/adt/atc/variants?maxItemCount=200-> totalItemCount 0
 *
 * Validating through those would have rejected DEFAULT — the system default,
 * which demonstrably works. `SCICHKV_HD` is the check-variant header table and
 * answers correctly for all three cases (502 rows on this system, DEFAULT and
 * ZMY_CHECK_VARIANT present, ZNO_SUCH_VARIANT_XX absent).
 *
 * ALSO ESTABLISHED, AND WHY THERE IS NO `check_variant_effective` FIELD: the
 * worklist document carries id, timestamp, usedObjectSet and objectSets, and
 * NO variant anywhere. ADT does not report which variant a run used, so a field
 * claiming to do so would be another echo wearing a verdict's name — the exact
 * defect this file exists to remove. The response reports what was requested
 * and whether that name was verified to exist, and says nothing it cannot know.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlausibleVariantName = isPlausibleVariantName;
exports.verifyCheckVariantExists = verifyCheckVariantExists;
exports.describeUnknownVariant = describeUnknownVariant;
exports.describeUserScopedVariant = describeUserScopedVariant;
const dataPreviewParser_1 = require("./dataPreviewParser");
const utils_1 = require("./utils");
/** Header table of ATC/SCI check variants. */
const VARIANT_TABLE = 'scichkv_hd';
/**
 * A variant name is a SAP object name. Reject anything that could not be one
 * before it reaches a WHERE clause, rather than escaping it.
 */
function isPlausibleVariantName(name) {
    return /^[A-Za-z0-9_/$][A-Za-z0-9_/$-]{0,29}$/.test(name);
}
async function verifyCheckVariantExists(connection, variant) {
    const name = variant.trim().toUpperCase();
    if (!isPlausibleVariantName(name)) {
        return {
            exists: false,
            reason: `"${variant}" is not a valid ATC check variant name.`,
        };
    }
    try {
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/datapreview/freestyle', 'POST', 'csrf', `SELECT checkvname, ciuser FROM ${VARIANT_TABLE} WHERE checkvname = '${name}'`, { rowNumber: 1 }, {
            Accept: 'application/xml, application/vnd.sap.adt.datapreview.table.v1+xml',
            'Content-Type': 'text/plain; charset=utf-8',
        });
        const parsed = (0, dataPreviewParser_1.parseDataPreviewXml)(String(response.data), 1);
        const row = parsed.rows[0];
        if (!row)
            return { exists: false };
        const owner = String(row.CIUSER ?? '').trim();
        return { exists: true, owner, userScoped: owner.length > 0 };
    }
    catch (error) {
        // A failed lookup must NOT block the run: this table is not guaranteed to
        // be readable on every system, and refusing to check because we could not
        // verify would be worse than running with an unverified name. The caller
        // reports `check_variant_verified: null` instead of claiming either way.
        return {
            exists: undefined,
            reason: error instanceof Error ? error.message : String(error),
        };
    }
}
/** The error text for a variant that is definitely not on this system. */
function describeUnknownVariant(variant) {
    return (`ATC check variant "${variant}" does not exist on this system ` +
        `(no row in ${VARIANT_TABLE.toUpperCase()}). ` +
        'Refusing to run: ADT accepts an unknown variant name with HTTP 200 and ' +
        'silently falls back to the system default, so the run would report findings ' +
        'for a DIFFERENT variant than the one requested — including a misleading ' +
        '"no findings". Check the name in SCI/ATC, or omit check_variant to use the ' +
        'system default explicitly.');
}
/**
 * The warning for a variant that exists but belongs to one user.
 *
 * Not a refusal. The mechanism is unproved (one user-scoped variant exists on
 * the reference system, so there was no second sample to test with), and
 * refusing outright would block a variant that may well work on another system.
 * But passing it in silence is what produced "our custom variant is green" from
 * a run that may have used DEFAULT, so the caller is told what to look for.
 */
function describeUserScopedVariant(variant, owner) {
    return (`Check variant "${variant}" is USER-SCOPED (SCICHKV_HD-CIUSER = "${owner}"), not global. ` +
        'The ATC worklist endpoint may not honour a user-scoped variant: it accepts the name, ' +
        'returns HTTP 200, and can run the system default instead — with no error and no downgrade ' +
        'notice. Findings identical to a DEFAULT run over the same objects are the signal that this ' +
        'happened. To be certain the run used your rules, promote the variant to a global one ' +
        '(blank CIUSER) in SCI/ATC, or compare this run against an explicit DEFAULT run.');
}
//# sourceMappingURL=atcCheckVariant.js.map