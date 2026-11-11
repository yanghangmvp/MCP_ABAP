/**
 * Object deletion via ADT's deletion API, with SAP's real result relayed —
 * plus a post-delete existence verification.
 *
 * WHY THIS EXISTS — deletion is the worst of the "silent false success" cases:
 *
 * 1. `@mcp-abap-adt/adt-clients` **fabricates** a success payload. Its
 *    `deleteStructure()` (core/structure/delete.js) spreads the real response
 *    and then OVERWRITES `data` with a hardcoded
 *    `{ success: true, message: "<X> deleted successfully" }`, so SAP's own
 *    `del:deletionResult` — including `del:isDeleted="false"` and the
 *    `del:message` list explaining WHY — never reaches the caller.
 * 2. `AdtStructure.delete()` calls `checkDeletion()` first (good) but never
 *    inspects its response, logging "Deletion check passed" regardless.
 * 3. The handlers then tested only `if (!deleteResult) throw`, i.e. that a
 *    response object exists, and reported `success: true`.
 *
 * Observed live: three `$TMP` structures reported "deleted successfully" twice
 * each while remaining in DD02L with AS4LOCAL='A'. (Common trait: a QUAN field
 * referencing the object's own unit field, so the dependency check considered
 * the object still referenced.) Batch cleanups therefore silently left objects
 * behind, and the next run failed with a misleading "already exists".
 *
 * `/sap/bc/adt/deletion/delete` is object-type agnostic — it takes the object
 * URI — so one implementation serves every DDIC type. Same in-repo-bypass
 * pattern as activateAdtObjects / runObjectCheckRun / the synchronous
 * unit-test run.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { type AdtResponseMessage } from './adtMessages';
import { type AxiosResponse } from './utils';
export interface DeletionResult {
    /** SAP's own `del:isDeleted` verdict — NOT the HTTP status. */
    isDeleted: boolean;
    messages: AdtResponseMessage[];
    errors: AdtResponseMessage[];
    status: number;
    /**
     * Per-object verdicts, when SAP reported more than one. A deletion can cascade
     * (deleting a table index also removes the table's technical-settings object),
     * and then the response carries one `del:object` per affected object.
     */
    objects?: Array<{
        uri: string;
        type: string;
        isDeleted: boolean;
        messages: AdtResponseMessage[];
    }>;
}
/** Build the ADT `deletionRequest` body for an arbitrary object URI. */
export declare function buildDeletionXml(objectUri: string, transportRequest?: string): string;
/**
 * Parse a `del:deletionResult` (or `del:checkResult`) response into
 * `{ isDeleted, messages }`. Namespace prefixes are stripped and `del:message`
 * is coerced to an array, so both a single message and a message list are
 * captured — the dep's single-message assumption is what collapsed real
 * multi-message failures into a generic "Deletion failed".
 *
 * MULTIPLE `del:object` ELEMENTS ARE NORMAL. A deletion can cascade: deleting a
 * table index also removes the table's technical-settings object, and SAP then
 * answers with one `del:object` per affected object. Reading `.object` as a
 * single node in that case yields an ARRAY, so `@_isDeleted` and `message` are
 * both `undefined` — which reported `isDeleted: false` with NO messages, i.e.
 * "the deletion failed and SAP gave no reason", for a deletion that had actually
 * happened. Measured on DM2/310 while deleting a table index.
 *
 * When several objects are reported, `isDeleted` is the verdict for the object
 * the caller asked about (matched on the URI), and `messages` carries every
 * message from every object so nothing is lost. `optionalTargetUri` lets the
 * caller name that object; without it the first entry is used.
 */
export declare function parseDeletionResult(response: AxiosResponse, optionalTargetUri?: string): DeletionResult;
/**
 * POST `/sap/bc/adt/deletion/delete` for one object and return SAP's verdict
 * plus every message. Transport/HTTP errors (a genuine 404, 423 lock, …) throw
 * and are handled by the caller.
 */
export declare function deleteAdtObjectWithMessages(connection: IAbapConnection, objectUri: string, transportRequest?: string): Promise<DeletionResult>;
/**
 * Ask ADT whether the object may be deleted (`/sap/bc/adt/deletion/check`).
 * Used to surface the ACTIONABLE reason when a delete turns out to have been
 * refused — e.g. "still used by <object>". Never throws: a failing check must
 * not mask the deletion outcome we are trying to explain.
 */
export declare function checkAdtDeletionAllowed(connection: IAbapConnection, objectUri: string): Promise<AdtResponseMessage[]>;
/**
 * Does the object still exist? A GET on its URI answering 404 (or 403 "does
 * not exist") means really gone. Any transport-level failure returns
 * `undefined` = "could not determine", so an unrelated network problem is never
 * reported as a failed deletion.
 */
export declare function adtObjectExists(connection: IAbapConnection, objectUri: string): Promise<boolean | undefined>;
/**
 * Verify that a deletion actually took effect, and build the failure message if
 * it did not. Returns `null` when the object is confirmed gone (or when
 * existence could not be determined — we never invent a failure); otherwise a
 * ready-to-throw explanation including SAP's reasons.
 *
 * This is the ground-truth step: it asks the system rather than trusting the
 * delete call's own report.
 */
export declare function describeFailedDeletion(connection: IAbapConnection, objectUri: string, subject: string, knownMessages?: readonly AdtResponseMessage[]): Promise<string | null>;
/**
 * Clean up after a `Create*` that failed AFTER the object was registered in SAP
 * — or, failing that, say what was left behind.
 *
 * WHY (field report round 1 I-4, still open in round 6 as F-4). Measured on DM2/310:
 *
 *     CreateDataElement ZMY_PROBE_DTEL, type_kind=domain,
 *                       type_name=ZNO_SUCH_DOMAIN_XX
 *       -> ERROR "No active domain ZNO_SUCH_DOMAIN_XX available"
 *     GetInactiveObjects(name_prefix='ZMY')
 *       -> ZMY_PROBE_DTEL  DTEL/DE   still there, inactive
 *
 * The call was HONEST — it reported the error — and still left an object
 * behind. That matters because an inactive shell in a package blocks later
 * activations in that package and nothing reports it except a sweep, so a
 * project that does not sweep accumulates them silently.
 *
 * THE OUTCOME IS NEVER INVENTED. The object is read back before and after: if
 * it is not there, nothing is claimed; if the removal fails or cannot be
 * confirmed, the message NAMES the object so the caller can delete it. As the
 * reporter put it — silence is the only outcome they cannot work with.
 *
 * Callers must only invoke this when their own create call actually succeeded.
 * A failure at the validate stage never wrote anything, and deleting on that
 * path could remove an object this call did not create.
 */
export declare function removePartialCreation(connection: IAbapConnection, options: {
    objectUri: string;
    objectLabel: string;
    transportRequest?: string;
    /**
     * What to do instead, when the shell could not be removed. Defaults to
     * "delete it before retrying", which is right for a shell nothing can use —
     * but wrong, and expensive, when the object is intact and merely locked in
     * another transport request (see transportConflict.describeTransportRecovery).
     */
    retryHint?: string;
    logger?: {
        debug?: (m: string) => void;
        warn?: (m: string) => void;
    };
}): Promise<string>;
//# sourceMappingURL=adtDeletion.d.ts.map