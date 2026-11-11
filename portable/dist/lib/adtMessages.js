"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorMessage = isErrorMessage;
exports.isWarningMessage = isWarningMessage;
exports.classifyAdtMessages = classifyAdtMessages;
exports.formatAdtMessages = formatAdtMessages;
exports.evaluateActivation = evaluateActivation;
exports.describeActivation = describeActivation;
exports.activationFlags = activationFlags;
/**
 * SAP message-type codes that mean "the operation did not succeed".
 * `A` = abort, `X` = exit/short dump, `E` = error. The long spellings appear in
 * some ADT payloads and in our own synthesized messages.
 */
const ERROR_TYPES = new Set(['e', 'a', 'x', 'error', 'abort', 'fatal']);
const WARNING_TYPES = new Set(['w', 'warning']);
function normalizeType(type) {
    return String(type ?? '')
        .trim()
        .toLowerCase();
}
/** True when a message means the operation failed (error/abort/dump). */
function isErrorMessage(msg) {
    return ERROR_TYPES.has(normalizeType(msg?.type));
}
/** True when a message is a warning (operation may still have succeeded). */
function isWarningMessage(msg) {
    return WARNING_TYPES.has(normalizeType(msg?.type));
}
/** Split messages by severity. Anything not error/warning counts as info. */
function classifyAdtMessages(messages) {
    const errors = [];
    const warnings = [];
    const infos = [];
    for (const msg of messages ?? []) {
        if (!msg)
            continue;
        if (isErrorMessage(msg))
            errors.push(msg);
        else if (isWarningMessage(msg))
            warnings.push(msg);
        else
            infos.push(msg);
    }
    return { errors, warnings, infos };
}
/** Render messages as `[E] text; [W] text` for a single-line error string. */
function formatAdtMessages(messages) {
    return messages
        .map((m) => {
        const t = String(m?.type ?? '').trim();
        return t ? `[${t}] ${m.text}` : m.text;
    })
        .filter(Boolean)
        .join('; ');
}
/**
 * Evaluate a raw activation result: any error-level message ⇒ not successful.
 *
 * The raw `activated` / `checked` / `generated` flags are passed through
 * unchanged so callers still see exactly what SAP reported (a no-op activation
 * of an already-active object legitimately answers `activated: false` with no
 * messages, and must not be mistaken for a failure).
 */
function evaluateActivation(raw) {
    const { errors, warnings } = classifyAdtMessages(raw?.messages);
    return {
        activated: !!raw?.activated,
        checked: !!raw?.checked,
        generated: !!raw?.generated,
        messages: raw?.messages ?? [],
        errors,
        warnings,
        success: errors.length === 0,
    };
}
/**
 * One-line summary of an activation outcome, suitable for a tool `message`.
 * Failures lead with "FAILED" plus the reasons, so a caller skimming the
 * response cannot mistake a rejected activation for a successful one.
 */
function describeActivation(outcome, subject) {
    if (!outcome.success) {
        return `Activation FAILED for ${subject}: ${outcome.errors.length} error(s) — ${formatAdtMessages(outcome.errors)}`;
    }
    if (!outcome.activated && outcome.messages.length === 0) {
        return `${subject} was already active — SAP reported nothing to activate (no-op)`;
    }
    const warn = outcome.warnings.length
        ? ` (${outcome.warnings.length} warning(s): ${formatAdtMessages(outcome.warnings)})`
        : '';
    return `${subject} activated successfully${warn}`;
}
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
function activationFlags(raw, outcome) {
    const flags = {
        /** THE VERDICT. Derived from SAP's messages, not from the flags below. */
        succeeded: outcome.success,
        activated: raw.activated,
        checked: raw.checked,
        generated: raw.generated,
    };
    if (outcome.success && raw.activated !== true) {
        flags.note =
            'activated is not true, but SAP reported no errors: there was nothing to activate ' +
                '(the object was already active). Read `succeeded`.';
    }
    else if (!outcome.success && raw.activated === true) {
        flags.note =
            'activated:true only means the activation RUN executed — SAP reported errors, so the ' +
                'object was NOT activated. Read `succeeded`.';
    }
    return flags;
}
//# sourceMappingURL=adtMessages.js.map