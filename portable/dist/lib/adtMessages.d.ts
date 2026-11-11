/**
 * ADT response-message classification and real-outcome evaluation.
 *
 * WHY THIS EXISTS — the "silent false success" family of bugs:
 * ADT frequently REFUSES an operation while still answering HTTP 200; the
 * refusal lives only in the response messages. Handlers that reported success
 * from the HTTP status (or, worse, by echoing the caller's own `activate: true`
 * request flag) therefore announced success for operations SAP had rejected.
 * The failure then resurfaced much later as an unrelated-looking dependency
 * error on the object that was never really created/activated/deleted.
 *
 * Every Create/Update/Delete/Activate handler funnels its raw ADT result
 * through this module so the reported outcome is SAP's, never the request's.
 *
 * Concretely observed on a live system (SAP_BASIS 7.56):
 *   - group activation returned `activationExecuted="true"` (= the activation
 *     RUN completed) together with `<msg type="E">… was not activated</msg>`
 *     for the individual objects, so `activated && checked` was a true-ish
 *     value for a failed activation;
 *   - `UpdateStructure(activate:true)` reported success for 9 of 9 DDL variants
 *     while only 2 actually activated.
 */
/** A single ADT response message, as parsed from `<msg>` / `<del:message>`. */
export interface AdtResponseMessage {
    type?: string;
    text: string;
    line?: number | string;
    column?: number | string;
}
/** True when a message means the operation failed (error/abort/dump). */
export declare function isErrorMessage(msg: AdtResponseMessage): boolean;
/** True when a message is a warning (operation may still have succeeded). */
export declare function isWarningMessage(msg: AdtResponseMessage): boolean;
/** Split messages by severity. Anything not error/warning counts as info. */
export declare function classifyAdtMessages(messages: readonly AdtResponseMessage[] | undefined | null): {
    errors: AdtResponseMessage[];
    warnings: AdtResponseMessage[];
    infos: AdtResponseMessage[];
};
/** Render messages as `[E] text; [W] text` for a single-line error string. */
export declare function formatAdtMessages(messages: readonly AdtResponseMessage[]): string;
/** Raw shape returned by `parseActivationResponse` / `activateAdtObjects`. */
export interface RawActivationResult {
    activated: boolean;
    checked: boolean;
    generated: boolean;
    messages: AdtResponseMessage[];
}
/** SAP's activation outcome, with `success` derived from the messages. */
export interface ActivationOutcome extends RawActivationResult {
    /**
     * TRUE only when SAP raised no error-level message. Note this is deliberately
     * NOT `activated && checked`: those flags describe whether the activation RUN
     * and CHECK were executed, not whether each object survived them — a rejected
     * object still comes back with `activationExecuted="true"`.
     */
    success: boolean;
    errors: AdtResponseMessage[];
    warnings: AdtResponseMessage[];
}
/**
 * Evaluate a raw activation result: any error-level message ⇒ not successful.
 *
 * The raw `activated` / `checked` / `generated` flags are passed through
 * unchanged so callers still see exactly what SAP reported (a no-op activation
 * of an already-active object legitimately answers `activated: false` with no
 * messages, and must not be mistaken for a failure).
 */
export declare function evaluateActivation(raw: RawActivationResult): ActivationOutcome;
/**
 * One-line summary of an activation outcome, suitable for a tool `message`.
 * Failures lead with "FAILED" plus the reasons, so a caller skimming the
 * response cannot mistake a rejected activation for a successful one.
 */
export declare function describeActivation(outcome: ActivationOutcome, subject: string): string;
/**
 * Build the `activation` block of a handler response.
 *
 * WHY THIS EXISTS: the raw SAP flags and the verdict routinely disagree, and
 * exposing them side by side without explanation trains callers to ignore both.
 * Observed live:
 *
 *   ActivateClass ZCL_MY_CLASS
 *   -> { activation: { activated: false, checked: false, generated: true },
 *        errors: [], message: "Class ZCL_MY_CLASS activated successfully" }
 *
 * The class really was active. `activated:false` with no messages means SAP had
 * NOTHING to activate — a no-op, which is a success. The flags describe whether
 * the activation RUN executed, not whether the object survived it; SAP sets
 * `activationExecuted="true"` even for objects it rejected.
 *
 * So the block keeps the raw flags (they are useful diagnostics) but leads with
 * one authoritative boolean and explains the disagreement whenever there is one.
 * A caller should read `succeeded` and nothing else.
 */
export declare function activationFlags(raw: {
    activated?: boolean;
    checked?: boolean;
    generated?: boolean;
}, outcome: ActivationOutcome): Record<string, unknown>;
//# sourceMappingURL=adtMessages.d.ts.map