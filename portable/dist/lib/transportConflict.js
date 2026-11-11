"use strict";
/**
 * Transport lock conflicts between the two legs of a create.
 *
 * WHY THIS EXISTS — a create is TWO writes, and SAP may put them in DIFFERENT
 * transport requests.
 *
 * Every DDIC create in this server has the same shape: leg 1 POSTs a bare shell
 * (name, package, description), leg 2 locks it and PUTs the real content
 * (labels, type information, row type, field list). Both legs are handed the
 * caller's `transport_request`.
 *
 * Measured by a reporting project, 4 of 4 attempts: when the caller passes a
 * **task** number, leg 1 does not land in that task. SAP resolves the object's
 * transport assignment for the package itself and locks the object in the
 * **parent request**. Leg 2 then presents the task, and SAP refuses:
 *
 *   ExceptionResourceLockConflict
 *   Object R3TR DTEL <name> is already locked in request <PARENT> of user <user>
 *
 * The object is left created, INACTIVE and without any of the content leg 2 was
 * carrying — and `removePartialCreation` cannot remove it either, because it is
 * locked in a request the cleanup is not working in. Passing a task number is
 * not a caller error: a task is what a developer is normally given, and SAP
 * itself resolved the parent.
 *
 * THE FIX IS TO FOLLOW SAP. The refusal names the request the object actually
 * went into, so leg 2 is retried once under THAT request. The retry is gated on
 * the ADT exception type (`ExceptionResourceLockConflict`), which is
 * language-independent — the message text beside it is localised (this account's
 * logon language is ZH), so no wording is matched.
 *
 * What the caller is told: the transport actually used, and — when it differs
 * from what was passed — a warning naming both. Echoing back the request the
 * caller sent while writing into another one is the report-shaped-lie this
 * project keeps removing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractConflictingRequest = extractConflictingRequest;
exports.runUnderResolvedTransport = runUnderResolvedTransport;
exports.describeTransportRecovery = describeTransportRecovery;
/**
 * A CTS request or task number: <SID>K<6 digits> (e.g. ABCK900001).
 * Requests and tasks are the same shape; only the parent/child link tells them
 * apart, and the lock message is what carries the winner.
 */
const REQUEST_NUMBER = /\b([A-Z][A-Z0-9]{2}K\d{6})\b/g;
/** ADT's own exception type for "this object belongs to another request". */
const LOCK_CONFLICT = /ResourceLockConflict/i;
function errorText(error) {
    const err = error;
    if (!err)
        return '';
    const body = err.response?.data;
    const bodyText = typeof body === 'string'
        ? body
        : body !== undefined && body !== null
            ? String(body)
            : '';
    return `${err.message ?? ''}\n${bodyText}`;
}
/**
 * The request SAP says the object is really locked in, or undefined.
 *
 * Returns a value ONLY for a lock conflict, and only for a request number that
 * is not the one already tried — so a retry can never re-send the value that
 * was just refused, and a failure that merely happens to quote a request number
 * (a check message, a deletion marker) never triggers one.
 */
function extractConflictingRequest(error, requested) {
    const text = errorText(error);
    if (!text || !LOCK_CONFLICT.test(text))
        return undefined;
    const wanted = requested?.trim().toUpperCase();
    const seen = new Set();
    for (const match of text.toUpperCase().matchAll(REQUEST_NUMBER)) {
        const number = match[1];
        if (number === wanted || seen.has(number))
            continue;
        seen.add(number);
        return number;
    }
    return undefined;
}
/**
 * Run the content leg of a create, following SAP if it names another request.
 *
 * `op` is called with the transport to use. On an `ExceptionResourceLockConflict`
 * naming a different request, it is called EXACTLY once more with that request.
 * Any other failure — and a second failure of any kind — propagates unchanged,
 * so this can only ever turn a failure into a success, never the reverse.
 */
async function runUnderResolvedTransport(op, requested, objectLabel, logger) {
    try {
        return {
            result: await op(requested),
            transport_used: requested,
            reassigned: false,
        };
    }
    catch (error) {
        const actual = extractConflictingRequest(error, requested);
        if (!actual)
            throw error;
        logger?.info?.(`${objectLabel}: SAP locked the object in ${actual}, not ${requested} — retrying under ${actual}`);
        const result = await op(actual);
        return {
            result,
            transport_used: actual,
            reassigned: true,
            warning: `Written under transport request ${actual}, not the requested ${requested}: ` +
                `SAP had already locked ${objectLabel} in ${actual} when the object was created ` +
                `(this happens when a TASK is passed and SAP resolves the object to its PARENT request). ` +
                `Use ${actual} for any further change to this object.`,
        };
    }
}
/**
 * Recovery advice for a create whose content leg could not be written and whose
 * shell could not be removed.
 *
 * Replaces "delete it before retrying", which is both expensive (a DTEL delete
 * in a transportable package leaves a deletion marker to transport) and wrong —
 * the reporting project ignored it and recovered all four objects on the first
 * try with the matching `Update*` call under the request named in the lock
 * message.
 */
function describeTransportRecovery(updateToolName, conflictingRequest) {
    return (`retry ${updateToolName} with the same arguments and ` +
        `transport_request = ${conflictingRequest} (the request the object is actually locked in); ` +
        'deleting it is not necessary.');
}
//# sourceMappingURL=transportConflict.js.map