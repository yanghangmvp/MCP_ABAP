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
/**
 * The request SAP says the object is really locked in, or undefined.
 *
 * Returns a value ONLY for a lock conflict, and only for a request number that
 * is not the one already tried — so a retry can never re-send the value that
 * was just refused, and a failure that merely happens to quote a request number
 * (a check message, a deletion marker) never triggers one.
 */
export declare function extractConflictingRequest(error: unknown, requested?: string): string | undefined;
export interface ResolvedTransportOutcome<T> {
    result: T;
    /** The request the write actually went into. */
    transport_used?: string;
    /** True when SAP redirected the write to a different request than requested. */
    reassigned: boolean;
    warning?: string;
}
/**
 * Run the content leg of a create, following SAP if it names another request.
 *
 * `op` is called with the transport to use. On an `ExceptionResourceLockConflict`
 * naming a different request, it is called EXACTLY once more with that request.
 * Any other failure — and a second failure of any kind — propagates unchanged,
 * so this can only ever turn a failure into a success, never the reverse.
 */
export declare function runUnderResolvedTransport<T>(op: (transportRequest: string | undefined) => Promise<T>, requested: string | undefined, objectLabel: string, logger?: {
    info?: (m: string) => void;
    warn?: (m: string) => void;
}): Promise<ResolvedTransportOutcome<T>>;
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
export declare function describeTransportRecovery(updateToolName: string, conflictingRequest: string): string;
//# sourceMappingURL=transportConflict.d.ts.map