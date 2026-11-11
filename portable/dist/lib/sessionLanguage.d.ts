/**
 * The language a write lands in is pinned by the SERVER SESSION, and the
 * session outlives the write.
 *
 * WHAT WAS MEASURED (DM2/310, S/4HANA 2023 FPS02, through the compiled
 * handlers). The FIRST message-class write on a connection fixes the language
 * for every later write on that connection, ACROSS OBJECTS, and `sap-language`
 * on the later requests does not change it — the lock, the PUT and the re-read
 * all carried ZH while the text landed in the EN row:
 *
 *   step 1  write(ZH)                    -> T100 SPRSL '1'   correct
 *   step 2  write(no language, i.e. EN)  -> T100 SPRSL '1'   WRONG
 *   step 3  write(ZH)                    -> T100 SPRSL '1'   correct
 *
 * And not per object: translate class A into ZH, then make a PLAIN
 * master-language edit to class B on the same connection — B's text goes into
 * B's ZH row and B's English row is never touched.
 *
 * Both directions are corruption, and the second one is worse: an ordinary edit
 * silently writing a translation row, reported as success, on the path every
 * caller uses. (The T100 guard in editMessageCore only runs when `language` is
 * passed, so it does not see that one.)
 *
 * NOTHING WE CAN SEND RESETS IT — every one of these was tried and MEASURED
 * against the T100 rows, not against an HTTP status:
 *
 *   - clearing the cookie jar                      -> still writes the old row
 *   - rotating `sap-adt-connection-id`             -> still writes the old row
 *   - an explicit `x-sap-adt-sessiontype: stateless` header (the round-1 P4
 *     remedy, which does fix the nodestructure bleed) -> still writes the old row
 *   - `GET /sap/public/bc/icf/logoff`, cookie dropped, then one GET carrying the
 *     wanted `sap-language` to re-establish   -> STILL writes the old row
 *
 * The last one appeared to work once and did NOT reproduce, so it is recorded
 * here as a failed remedy rather than shipped as a fix. Only a NEW connection
 * object behaves correctly, which points at something bound to the connection
 * itself (its keep-alive socket is the leading suspect) rather than at the
 * cookie, the ADT session id or the session type. That is not yet proven.
 *
 * SO THIS MODULE DOES NOT PRETEND TO FIX IT. It REFUSES the write instead.
 * Shipping a reset that does not reset would be a call that looks accepted and
 * silently does the wrong thing — the exact shape this project keeps removing.
 * A refusal costs the caller a server restart; the alternative costs them a
 * master-language text they cannot tell is gone.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
/** The language the connection wrapper injects when a caller names none. */
export declare function defaultWriteLanguage(): string;
export interface LanguagePinVerdict {
    ok: boolean;
    /** The language this connection is already committed to, when known. */
    pinned?: string;
    reason?: string;
}
/**
 * May a write in `language` proceed on this connection?
 *
 * Call INSIDE the exclusive section that also takes the lock — `runExclusive` is
 * one global chain and is not re-entrant.
 *
 * The rules:
 *
 *  - nothing recorded yet -> ALLOW, and remember the language. A fresh
 *    connection takes the language of its first write, which is the case that
 *    provably works.
 *  - recorded language MATCHES -> ALLOW. This is the common case, including a
 *    batch of translations into one language, so a batch pays nothing.
 *  - recorded language DIFFERS -> REFUSE, before anything is written.
 *
 * `undefined` for `language` means the caller wants the server's default write
 * language, so it is compared as that rather than treated as "don't care" — an
 * ordinary edit landing in a translation row is the worse half of this defect,
 * and it is the half no guard downstream is watching.
 */
export declare function checkSessionLanguage(connection: IAbapConnection, language: string | undefined): LanguagePinVerdict;
/** Test seam: forget what we believe about this connection. */
export declare function forgetSessionLanguage(connection: IAbapConnection): void;
//# sourceMappingURL=sessionLanguage.d.ts.map