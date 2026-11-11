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
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
export interface CheckVariantVerification {
    /** true = present in SCICHKV_HD; false = absent; undefined = could not tell. */
    exists?: boolean;
    /** SCICHKV_HD-CIUSER. Empty string = global variant. */
    owner?: string;
    /** true when CIUSER is non-blank, i.e. the variant belongs to one user. */
    userScoped?: boolean;
    /** Set when the lookup itself failed, so the caller can say why. */
    reason?: string;
}
/**
 * A variant name is a SAP object name. Reject anything that could not be one
 * before it reaches a WHERE clause, rather than escaping it.
 */
export declare function isPlausibleVariantName(name: string): boolean;
export declare function verifyCheckVariantExists(connection: IAbapConnection, variant: string): Promise<CheckVariantVerification>;
/** The error text for a variant that is definitely not on this system. */
export declare function describeUnknownVariant(variant: string): string;
/**
 * The warning for a variant that exists but belongs to one user.
 *
 * Not a refusal. The mechanism is unproved (one user-scoped variant exists on
 * the reference system, so there was no second sample to test with), and
 * refusing outright would block a variant that may well work on another system.
 * But passing it in silence is what produced "our custom variant is green" from
 * a run that may have used DEFAULT, so the caller is told what to look for.
 */
export declare function describeUserScopedVariant(variant: string, owner: string): string;
//# sourceMappingURL=atcCheckVariant.d.ts.map