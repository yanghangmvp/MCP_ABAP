/**
 * Shared core for the single-message maintenance tools (AddMessage,
 * UpdateMessage).
 *
 * `UpdateMessageClass` replaces the whole message list, so adding one message to
 * a large class meant re-emitting every other message by hand. These three tools
 * read the current list from SAP, change one entry and write it back, so the
 * caller never holds the messages it is not changing — and therefore cannot lose
 * one. The result is verified by reading the class again.
 *
 * The tools live in their own files (one TOOL_DEFINITION per file, as everywhere
 * else in this repo) and share `editMessage` from here — the same split as
 * PublishServiceBinding / UnpublishServiceBinding.
 *
 * NO DeleteMessage TOOL EXISTS, and that is a finding rather than an omission.
 * Measured on DM2/310 (SAP_BASIS 7.58):
 *
 *   - `UpdateMessageClass` is an UPSERT, not a whole-set replace. PUTting the
 *     class with 2 of its 3 messages leaves all 3 in place. (Good news for the
 *     other operations: a message cannot be lost by being omitted. But it also
 *     means omission cannot delete one.)
 *   - PUTting a message with an EMPTY text clears `mc:msgtext` and keeps the row.
 *   - the per-message sub-resource `/messages/{no}` DOES exist — a GET answers
 *     200 with an empty `<msg:message/>` — but DELETE on it answers 423
 *     `ExceptionResourceInvalidLockHandle` whether the lock is taken on the
 *     sub-resource or on the message class.
 *
 * So removing a single message is not reachable through ADT on this release; it
 * needs SE91. A DeleteMessage tool would have been an enum value that can never
 * succeed, which is the failure mode this file exists to avoid.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type MessageEditMode } from '../../../lib/messageClassXml';
export declare const MSGNO_DESC = "Message number, 1-3 digits. Zero-padded automatically (\"7\" and \"007\" are the same message).";
export interface MessageEditArgs {
    message_class_name: string;
    msgno: string | number;
    text?: string;
    self_explanatory?: boolean;
    transport_request?: string;
    /** Two-letter language for a TRANSLATION write (update mode only). */
    language?: string;
}
/**
 * What the guard actually established about the master-language row.
 *
 * ROUND 4, R4-D1. The summary sentence used to be a constant — it said "the
 * EN-language text was verified unchanged" even when the guard had not run at
 * all. Measured by a reporting project across 109 translation writes: on 5 of
 * them (4.6%) the structured `warnings` said the verification had failed while
 * `message` said it had passed, in the same response. That is the false-verdict
 * family this project keeps closing, in the one field a human or a log line
 * actually reads. The sentence is now DERIVED from this value and from nothing
 * else, and `master_language_check` carries the same verdict as data.
 */
export type MasterCheck = 
/** Read before and after; the master row was present and is byte-identical. */
'verified_unchanged'
/** The T100 read failed, so nothing at all was checked. */
 | 'not_verified'
/** The after-read worked but there was no before-state to compare against. */
 | 'not_proven';
/**
 * The summary sentence for a translation write. Claims exactly what ran.
 *
 * When anything went into `warnings`, the sentence says so: a caller reading
 * only `message` must never be left with an assurance that the structured
 * fields contradict.
 */
export declare function describeTranslation(className: string, msgno: string, language: string, masterLanguage: string | undefined, check: MasterCheck, warningCount: number): string;
/** One T100 row: the ground truth this handler verifies itself against. */
interface T100Row {
    language: string;
    text: string;
}
/**
 * Read the T100 rows for one message, per language.
 *
 * A read of the message class is NOT proof for a translation: ADT falls back to
 * the master-language text when the requested language has no row, so a ZH read
 * returns the English text and looks like a success. T100 is the only place that
 * distinguishes "translated" from "falling back", which is exactly why the
 * reporting project asked for a per-language row count as the acceptance test.
 */
export interface T100ReadResult {
    /** The rows, or undefined when both attempts failed. */
    rows?: T100Row[];
    /**
     * How many attempts it took. 1 = clean, 2 = the retry saved it, and when
     * `rows` is undefined, 2 = both attempts failed.
     *
     * ROUND 4 FOLLOW-UP. The retry closed R4-F1 and, in doing so, ERASED ITS OWN
     * TELEMETRY: a single transient failure produced a completely clean response,
     * so from outside nobody could tell "read worked first time" from "read failed
     * once and the retry covered it". The reporting project pointed this out —
     * their 4.6% per-call failure rate became unmeasurable, and a clean run became
     * weak evidence no matter how many calls they made (P(zero degradations in 16
     * calls at 4.6%) is about 0.47, a coin flip). Reporting the attempt count turns
     * every single call back into a direct observation of the underlying endpoint,
     * which is far more statistical power than waiting for the rare double failure.
     */
    attempts: number;
}
export declare function readT100Rows(client: any, className: string, msgno: string, logger?: any): Promise<T100ReadResult>;
export declare function editMessage(context: HandlerContext, args: MessageEditArgs, mode: MessageEditMode): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=editMessageCore.d.ts.map