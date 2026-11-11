/**
 * Turning a syntax-check failure into something a caller can act on.
 *
 * WHY THIS FILE EXISTS (field report round 3, K-3 — their number one ask).
 *
 * The dependency's per-type `check()` wrappers collapse every message into one
 * string and throw it (`core/class/check.js`):
 *
 *     const errorMessages = checkResult.errors.map((err) => err.text).join('; ');
 *     throw new Error(`Class check failed: ${errorMessages}`);
 *
 * What the caller received:
 *
 *     New code check failed: Class check failed: Field "IO_OUT" is unknown.;
 *     Field "IO_OUT" is unknown.; Field "IO_OUT" is unknown.; … (12 times)
 *
 * Twelve identical sentences, no positions, for twelve DIFFERENT places in the
 * source. There is nothing to act on except re-read the file, guess, and re-send
 * the whole object. The reporter measured the cost of exactly that loop in one
 * project: **55 full-source re-sends, 661 KB, ~169k tokens** — and every blind
 * re-send is also a chance to drop a method by hand.
 *
 * The positions were never missing from SAP's answer. ADT puts them in the
 * fragment of each message's `chkrun:uri` (`…/source/main#start=42,7`), which
 * `parseCheckRunResponse` now decodes (see `positionFromHref`). So the fix is
 * not to obtain new data — it is to stop discarding data we already had.
 *
 * The formatting rules here follow from what made the original output useless:
 *   - lead with the position, because that is the only part that tells the
 *     caller WHERE to edit;
 *   - collapse repeats into `(x12)` with every line listed, because twelve
 *     copies of one sentence carry one sentence of information;
 *   - sort by line, so the list reads in the order the caller will fix it;
 *   - keep warnings out of the error text but report the count, so a failure
 *     message is never padded with things that did not cause it.
 */
import type { CheckRunMessage, ParsedCheckRunResult } from './checkRunParser';
export interface CheckFinding {
    severity: 'error' | 'warning' | 'info';
    /** Every line this exact text was reported on, ascending. */
    lines: number[];
    /** Column of the first occurrence, when SAP supplied one. */
    column?: number;
    text: string;
    /** How many times this exact text was reported. */
    count: number;
}
/**
 * Group identical message texts, keeping every line they occurred on.
 *
 * Deliberately keyed on the TEXT alone, not on text+line: the repeated
 * `Field "IO_OUT" is unknown.` is one problem reported at twelve places, and a
 * caller fixes it once. Keying on text+line would have preserved all twelve
 * entries and saved nothing.
 */
export declare function collapseCheckMessages(messages: CheckRunMessage[]): CheckFinding[];
/** One human-readable line per finding: `line 42: <text> (x12, also lines …)`. */
export declare function formatCheckFinding(finding: CheckFinding): string;
export declare function formatCheckFindings(findings: CheckFinding[]): string;
/**
 * The error a caller gets when a pre-write check rejects their source.
 *
 * Includes the warning COUNT but not the warning text: warnings did not cause
 * the failure, and padding a failure message with them is how the useful part
 * gets lost.
 */
export declare function describeCheckFailure(result: ParsedCheckRunResult, subject: string): string;
/**
 * The one-line verdict of a STANDALONE `Check*` call — success or failure.
 *
 * WHY THIS IS SEPARATE from `describeCheckFailure` (field report round 6, F-2). The
 * round-3 fix routed the four PRE-WRITE checks through the formatter and
 * stopped there. The standalone `Check*` tools kept going through the
 * dependency, so the same source, in the same session, produced two different
 * answers minutes apart:
 *
 *     UpdateClass  -> line 16,4: Field "IO_OUT" is unknown. (x4, also lines 17, 18, 19)
 *     CheckClass   -> Field "IO_OUT" is unknown.; Field "IO_OUT" is unknown.;
 *                     Field "IO_OUT" is unknown.; Field "IO_OUT" is unknown.
 *
 * That is the worse half, because `Check*` is where a caller is SENT when
 * something fails — by this server's own activation-failure text, by the
 * reporter's runbook, and by their recovery procedure (`GetInactiveObjects` ->
 * `Check*` each survivor -> fix -> sweep again). The list a caller is told to go
 * and fetch was the one still arriving without positions.
 *
 * Unlike the pre-write path this does NOT throw: a check that finds errors is a
 * successful CHECK. The errors are the answer, not a failure to produce one.
 */
export declare function describeCheckOutcome(result: ParsedCheckRunResult, subject: string): string;
/**
 * Structured findings for a tool response, so a caller does not have to parse
 * the message string back apart.
 */
export declare function checkFindingsPayload(result: ParsedCheckRunResult): Record<string, unknown>;
/** Parse a raw /sap/bc/adt/checkruns response into findings. */
export declare function parseCheckFindings(response: unknown): ParsedCheckRunResult;
//# sourceMappingURL=checkMessages.d.ts.map