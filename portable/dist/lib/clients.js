"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateTimeout = annotateTimeout;
exports.annotateBareWriteFailure = annotateBareWriteFailure;
exports.createAdtClient = createAdtClient;
exports.getAdtClient = getAdtClient;
exports.resetClientCache = resetClientCache;
const adt_clients_1 = require("@mcp-abap-adt/adt-clients");
const connectionEvents_1 = require("./connectionEvents");
const systemContext_1 = require("./systemContext");
const utils_1 = require("./utils");
let adtClient;
let adtClientConnection;
// Connections already patched with the sap-language injector (idempotency guard).
const sapLanguageWrapped = new WeakSet();
/**
 * Pin the ADT logon language to SAP_LANGUAGE on every request of this connection.
 *
 * The `@mcp-abap-adt/connection` layer never sends `sap-language`, so the logon
 * language defaults to the SAP account default (e.g. ZH). SAP uses the LOGON
 * language as the original language of newly created objects and IGNORES the
 * payload's `adtcore:masterLanguage`. When SAP_LANGUAGE (used to build the
 * payload's masterLanguage + description language) differs from that account
 * default, creates break in language-dependent ways:
 *   - CreateView → 400 `DDIC_ADT_DDLS/016` "Language EN … not equal to original ZH"
 *   - CreateDataElement → `ExceptionInvalidData` "缺少描述" (description filed under
 *     the wrong language)
 * Injecting `sap-language == SAP_LANGUAGE` makes the logon language and the
 * declared language agree by construction, for every object type. Idempotent,
 * never overrides a request that already set its own `sap-language`.
 *
 * CONSEQUENCE worth knowing: because SAP takes the ORIGINAL LANGUAGE of a new
 * object from the logon language, every object created through this server gets
 * SAP_LANGUAGE (default EN) as its original language — regardless of what the
 * operator's SAP account default is. Objects the same person creates by hand in
 * SE11/SE80 follow THEIR logon language instead, so a package can end up
 * holding objects with different original languages. That is deliberate (it is
 * what makes creates deterministic across accounts); align the two by setting
 * SAP_LANGUAGE to the language the team actually works in.
 */
function wrapConnectionSapLanguage(connection) {
    const conn = connection;
    if (typeof conn.makeAdtRequest !== 'function')
        return;
    if (sapLanguageWrapped.has(conn))
        return;
    sapLanguageWrapped.add(conn);
    const lang = ((0, systemContext_1.getSystemContext)().masterLanguage ||
        process.env.SAP_LANGUAGE ||
        'EN').toUpperCase();
    const base = conn.makeAdtRequest.bind(conn);
    conn.makeAdtRequest = async (request) => {
        const params = { ...(request?.params || {}) };
        if (params['sap-language'] == null) {
            params['sap-language'] = lang;
        }
        const outgoing = { ...request, params };
        try {
            return await base(outgoing);
        }
        catch (error) {
            // SESSION RETRY (field report round 3, K-6).
            //
            // A server session that expired arrives as HTTP 400 "Session Timed Out",
            // which at the caller's level is indistinguishable from "your input was
            // wrong" — so an agent rewrites a perfectly good request. handleGetSqlQuery
            // grew a local retry for exactly this; it was the ONLY place that had one,
            // and `GetClass` surfaced `400 Session Timed Out` twice in one session.
            //
            // Retrying here covers every handler at once, in-repo and via adt-clients,
            // because this wrapper is the single choke point both go through.
            //
            // DELIBERATELY GET-ONLY. A session failure usually means the request never
            // executed, but "usually" is not good enough to re-send a create, an
            // update or a delete: a double-executed POST can leave a second object or
            // a second transport entry. Reads are idempotent, and reads are where this
            // was actually hurting. Mutating calls still fail, with SAP's own words.
            const method = String(outgoing?.method || 'GET').toUpperCase();
            if (method === 'GET' && isSessionError(error)) {
                return base(outgoing);
            }
            throw annotateBareWriteFailure(annotateTimeout(error, method), method);
        }
    };
}
/**
 * Say what a TIMEOUT means, which is not the same thing for a read and a write
 * (round 3 R3-F3).
 *
 * A reporting project hit three timeouts in one session and got the identical
 * message for two OPPOSITE outcomes:
 *
 *   * `UpdateMessage` x15 in parallel on one message class — 2 timed out and had
 *     NOT been applied. Re-sending them was the right move.
 *   * `RuntimeRunProgram` on a report that writes and activates 79 DDIC objects —
 *     timed out but had COMPLETED server-side. They only found out by querying
 *     DD04T afterwards; re-sending would have re-run the whole thing.
 *
 * Both said `timeout of 45000ms exceeded`. A timeout is a statement about OUR
 * patience, never about the server: the request was sent, and what happened to
 * it is unknown. So the message now says which of the two situations the caller
 * is in — for a read, nothing happened that matters; for a write, the work may
 * be done and must be VERIFIED before a retry — and names the knob that raises
 * the limit, because 45 s is short for DDIC mass activation.
 */
function annotateTimeout(error, method) {
    if (!(error instanceof Error))
        return error;
    const code = error?.code;
    const isTimeout = code === 'ECONNABORTED' ||
        code === 'ETIMEDOUT' ||
        /timeout of \d+ms exceeded/i.test(error.message);
    if (!isTimeout)
        return error;
    if (error.message.includes('SAP was still asked to do the work'))
        return error;
    const isRead = method === 'GET' || method === 'HEAD';
    error.message = isRead
        ? `${error.message} — no response within the client timeout. The call is a read, ` +
            'so nothing was changed and it is safe to retry. Raise SAP_TIMEOUT_DEFAULT ' +
            '(milliseconds, default 45000) if the read is legitimately slow.'
        : `${error.message} — SAP was still asked to do the work: the request was sent and ` +
            'no answer arrived in time, so it may have completed server-side. VERIFY the ' +
            'result (read the object back, or query the table it writes) BEFORE retrying — ' +
            'a timeout does not mean the write did not happen. Raise SAP_TIMEOUT_DEFAULT ' +
            '(milliseconds, default 45000) for long-running writes such as mass activation.';
    return error;
}
/**
 * Give a bare write failure the one sentence the caller needs (field report round 6, F-3).
 *
 * The session retry above is GET-only on purpose, and the reporter agrees with
 * that: re-sending a create can leave a second object. The COST of that choice
 * is that a session-level failure on a write reaches the caller as
 *
 *     Error: Request failed with status code 400
 *
 * which is exactly the uninformative message the K-3 work existed to eliminate,
 * and it is intermittent — the reporter hit it once, built a theory about shell
 * classes, and their own probes killed the theory. Faced with that, a caller
 * rewrites source that was never wrong.
 *
 * So: no retry, but say what it might be. Only when the response carried NO
 * body — if SAP explained itself, that explanation is the answer and adding a
 * guess next to it would be noise.
 */
function annotateBareWriteFailure(error, method) {
    if (method === 'GET' || method === 'HEAD')
        return error;
    const status = error?.response?.status;
    if (typeof status !== 'number' || status < 400 || status >= 500)
        return error;
    // 401/403 are stable answers about credentials, not about the session.
    if (status === 401 || status === 403)
        return error;
    const raw = error?.response?.data;
    const body = typeof raw === 'string' ? raw.trim() : raw ? '1' : '';
    if (body)
        return error;
    if (!(error instanceof Error))
        return error;
    if (error.message.includes('session-level failure'))
        return error;
    error.message =
        `${error.message} — SAP returned no explanation, so this may be a ` +
            'session-level failure rather than a rejected request. Retry the call once ' +
            'before changing your source; this call is not retried automatically ' +
            'because re-sending a write can leave a second object behind.';
    return error;
}
/**
 * Is this failure about the SERVER SESSION rather than about the request?
 *
 * Kept in sync with lib/dataPreviewParser's own check — that one classifies a
 * Data Preview 400 body, this one classifies any ADT failure.
 */
function isSessionError(error) {
    const status = error?.response?.status;
    // Never retry an authentication or authorization failure: those are stable
    // answers, and repeating them just doubles the cost of finding out.
    if (status === 401 || status === 403)
        return false;
    const body = typeof error?.response?.data === 'string' ? error.response.data : '';
    const text = `${error?.message ?? ''} ${body}`.toLowerCase();
    return (text.includes('session timed out') ||
        text.includes('session has timed out') ||
        text.includes('csrf token validation failed') ||
        text.includes('invalid csrf token'));
}
function createAdtClient(connection, logger) {
    wrapConnectionSapLanguage(connection);
    const ctx = (0, systemContext_1.getSystemContext)();
    const options = ctx.masterSystem || ctx.responsible || ctx.masterLanguage
        ? {
            masterSystem: ctx.masterSystem,
            responsible: ctx.responsible,
            masterLanguage: ctx.masterLanguage,
        }
        : undefined;
    if (ctx.isLegacy) {
        return new adt_clients_1.AdtClientLegacy(connection, logger, options);
    }
    return new adt_clients_1.AdtClient(connection, logger, options);
}
function getAdtClient() {
    const connection = (0, utils_1.getManagedConnection)();
    if (!adtClient || adtClientConnection !== connection) {
        adtClient = createAdtClient(connection);
        adtClientConnection = connection;
    }
    return adtClient;
}
function resetClientCache() {
    adtClient = undefined;
    adtClientConnection = undefined;
}
(0, connectionEvents_1.registerConnectionResetHook)(resetClientCache);
//# sourceMappingURL=clients.js.map