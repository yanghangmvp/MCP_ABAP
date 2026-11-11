"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSessionMode = setSessionMode;
exports.runExclusive = runExclusive;
exports.escXml = escXml;
exports.getAdt = getAdt;
exports.lockAdt = lockAdt;
exports.unlockAdt = unlockAdt;
exports.runLocked = runLocked;
exports.putAdtContent = putAdtContent;
exports.putAdtSource = putAdtSource;
exports.deleteAdt = deleteAdt;
exports.runObjectCheckRun = runObjectCheckRun;
exports.buildActivationUri = buildActivationUri;
exports.activateAdtObjects = activateAdtObjects;
exports.activateAdt = activateAdt;
exports.activateAndEvaluate = activateAndEvaluate;
exports.activateOrThrow = activateOrThrow;
exports.evaluateActivationResponse = evaluateActivationResponse;
exports.activateWrittenObject = activateWrittenObject;
exports.writtenActivationFields = writtenActivationFields;
exports.checkSourceOrThrow = checkSourceOrThrow;
exports.checkObjectAndReport = checkObjectAndReport;
const adtMessages_1 = require("./adtMessages");
const checkMessages_1 = require("./checkMessages");
const sessionLanguage_1 = require("./sessionLanguage");
const utils_1 = require("./utils");
/** Switch the connection's session mode (no-op if unsupported). */
function setSessionMode(connection, mode) {
    connection.setSessionType?.(mode);
}
/**
 * Per-connection serialization of session-mode-sensitive operations.
 *
 * `setSessionType` is CONNECTION-GLOBAL state. The MCP server can dispatch tool
 * calls concurrently on one shared connection, so two operations that toggle
 * the session mode (any create POST + any runLocked block) would interleave:
 * one flips the session to stateless while the other is mid lock→mutate→unlock,
 * the mutate lands in the wrong session (403 "… is currently editing …"), and
 * the enqueue LEAKS (survives even a restart until SAP reaps the abandoned
 * session). Chaining every such op onto one per-connection promise makes them
 * run strictly one-at-a-time, eliminating that race at the source.
 */
// A SINGLE process-global chain (not per-connection): one MCP server maps to
// one SAP user session, and — critically — the server may hand each tool call a
// different connection *wrapper* instance over the same underlying session, so a
// per-connection key would fail to serialize concurrent calls. Session mode is
// effectively global to that session, so serialize globally. The `connection`
// param is kept for API symmetry / future use.
let globalChain = Promise.resolve();
function runExclusive(_connection, fn) {
    // Run fn after whatever is currently queued (ignoring its outcome); store a
    // never-rejecting tail so one failure can't break the chain for the next.
    const result = globalChain.then(fn, fn);
    globalChain = result.then(() => undefined, () => undefined);
    return result;
}
/** Escape a string for use in an XML attribute or text node. */
function escXml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
/** GET an object (or its source) by URL. Returns the raw body string. */
async function getAdt(connection, url, params) {
    const res = await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'GET', 'default', undefined, params);
    return String(res?.data ?? '');
}
/** Lock an object. Requires the connection to already be in stateful mode. */
async function lockAdt(connection, objectUrl, 
/**
 * Language for the stateful session this LOCK creates.
 *
 * The language a DDIC text is written in comes from the SESSION, and this
 * request is the one that opens the stateful session — so it must carry the
 * language. It is NOT sufficient on its own: the CSRF fetch that precedes this
 * POST also has to carry it, which is what `withForcedLanguage` is for.
 * Measured on DM2/310 against T100 rows: lock + PUT alone overwrote the
 * master-language row; every request of the write carrying the language left
 * it byte-identical and added the target-language row.
 */
language) {
    let res;
    try {
        res = await (0, utils_1.makeAdtRequestWithTimeout)(connection, objectUrl, 'POST', 'csrf', undefined, {
            _action: 'LOCK',
            accessMode: 'MODIFY',
            ...(language ? { 'sap-language': language } : {}),
        }, {
            Accept: 'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result',
        });
    }
    catch (error) {
        // Translate the raw 403 "currently editing" HTML dump into a clean,
        // actionable message. This happens when an existing edit session (often a
        // previous, abandoned operation) still holds the enqueue.
        const status = error?.response?.status;
        const body = String(error?.response?.data ?? '');
        if (status === 403 &&
            /ExceptionResourceNoAccess|currently editing|currently being edited|正在.*编辑/i.test(body)) {
            const owner = body.match(/(?:User|使用者)\s+([^\s<]+)\s+(?:is currently editing|当前编辑)/)?.[1];
            throw new Error(`${objectUrl} is locked by an existing SAP edit session (enqueue)${owner ? `, held by ${owner}` : ''}. ` +
                `A previous or abandoned operation still holds the lock. Release it in transaction SM12 or wait for it to time out, then retry.`);
        }
        throw error;
    }
    const handle = String(res?.data ?? '').match(/<LOCK_HANDLE>([^<]*)<\/LOCK_HANDLE>/)?.[1];
    if (!handle) {
        throw new Error(`Could not obtain lock handle for ${objectUrl}`);
    }
    return handle;
}
/** Unlock an object (best-effort; never throws). */
async function unlockAdt(connection, objectUrl, lockHandle) {
    try {
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, objectUrl, 'POST', 'default', undefined, { _action: 'UNLOCK', lockHandle });
    }
    catch {
        // ignore unlock failures during cleanup
    }
}
/**
 * Run `work` while holding a MODIFY lock inside a single stateful session.
 * Switches the connection to stateful for the duration, then always unlocks
 * and restores stateless mode.
 */
async function runLocked(connection, objectUrl, work, 
/** Session language for the lock — see lockAdt. */
language, logger) {
    // Serialize against every other session-mode-sensitive op on this connection.
    return runExclusive(connection, async () => {
        // INSIDE the exclusive section on purpose: this may end the server session,
        // and doing that while another operation holds a lock would break it.
        // runExclusive is one global chain and is not re-entrant, so it cannot be
        // nested — the reset has to happen here rather than at the call site.
        const languageVerdict = (0, sessionLanguage_1.checkSessionLanguage)(connection, language);
        if (!languageVerdict.ok) {
            logger?.warn?.(`Refused a write to ${objectUrl}: ${languageVerdict.reason ?? 'language pin'}`);
            throw new Error(`Refusing to write ${objectUrl}: ${languageVerdict.reason}`);
        }
        setSessionMode(connection, 'stateful');
        try {
            const lockHandle = await lockAdt(connection, objectUrl, language);
            try {
                return await work(lockHandle);
            }
            finally {
                await unlockAdt(connection, objectUrl, lockHandle);
            }
        }
        finally {
            setSessionMode(connection, 'stateless');
        }
    });
}
/** PUT full object XML content (structured objects: MSAG, ENQU). */
async function putAdtContent(connection, objectUrl, xml, lockHandle, transport, 
/**
 * Overrides the `sap-language` the connection wrapper would otherwise inject.
 * Pass the SAME value the lock was taken with — the lock decides the row, this
 * only keeps the request consistent with it.
 */
language) {
    const params = { lockHandle };
    if (transport)
        params.corrNr = transport;
    if (language)
        params['sap-language'] = language;
    await (0, utils_1.makeAdtRequestWithTimeout)(connection, objectUrl, 'PUT', 'default', xml, params, {
        'Content-Type': 'application/*',
    });
}
/** PUT plain-text source (source-based objects: XSLT). */
async function putAdtSource(connection, sourceUrl, source, lockHandle, transport) {
    const params = { lockHandle };
    if (transport)
        params.corrNr = transport;
    const ctype = /^<\?xml\s/i.test(source)
        ? 'application/*'
        : 'text/plain; charset=utf-8';
    await (0, utils_1.makeAdtRequestWithTimeout)(connection, sourceUrl, 'PUT', 'default', source, params, {
        'Content-Type': ctype,
    });
}
/** DELETE an object (lock must be held in the current stateful session). */
async function deleteAdt(connection, objectUrl, lockHandle, transport) {
    const params = { lockHandle };
    if (transport)
        params.corrNr = transport;
    await (0, utils_1.makeAdtRequestWithTimeout)(connection, objectUrl, 'DELETE', 'default', undefined, params);
}
/**
 * Run an abapCheckRun for an existing object directly (bypassing adt-clients'
 * per-type `check()` wrappers).
 *
 * Why: for DDIC objects whose check produces NO messages (a clean domain / data
 * element), adt-clients' own parseCheckRunResponse misreads the message-less
 * `<chkrun:checkReport status="processed"/>` as `has_errors: true` and its
 * `check()` THROWS "<Type> check failed:" (empty) — so CheckDomain /
 * CheckDataElement error on EVERY existing object. The ADT endpoint itself is
 * fine (verified: HTTP 200, status=processed, no messages). Posting the checkrun
 * ourselves and parsing with our own `parseCheckRunResponse` (which correctly
 * treats "processed + no messages" as success) fixes it. Returns the raw
 * response for the caller to parse.
 */
async function runObjectCheckRun(connection, objectUri, 
// 'new' is what ADT expects when checking DDIC source that is not yet saved;
// the dependency's table check uses it as its default.
version = 'active', sourceCode, artifactContentType = 'text/plain; charset=utf-8') {
    // With sourceCode the check runs against the SUBMITTED source (an inline
    // base64 artifact), not against whatever version the server has stored.
    //
    // This matters because adt-clients' per-type `check(config, status)` wrappers
    // accept a source/DDL field in their config and then hardcode `undefined` for
    // it (see AdtStructure.check → checkStructure(..., undefined, ...)), so a
    // "check my new code" call silently degraded into "check the stored inactive
    // version". Consequence: an object whose stored inactive version was broken
    // could never be repaired by an update — the pre-update check kept failing on
    // the OLD version and aborted before the new source was ever written.
    const body = sourceCode
        ? `<?xml version="1.0" encoding="UTF-8"?>` +
            `<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">` +
            `<chkrun:checkObject adtcore:uri="${escXml(objectUri)}" chkrun:version="${version}">` +
            `<chkrun:artifacts>` +
            `<chkrun:artifact chkrun:contentType="${escXml(artifactContentType)}" chkrun:uri="${escXml(objectUri)}/source/main">` +
            `<chkrun:content>${Buffer.from(sourceCode, 'utf-8').toString('base64')}</chkrun:content>` +
            `</chkrun:artifact>` +
            `</chkrun:artifacts>` +
            `</chkrun:checkObject>` +
            `</chkrun:checkObjectList>`
        : `<?xml version="1.0" encoding="UTF-8"?>` +
            `<chkrun:checkObjectList xmlns:chkrun="http://www.sap.com/adt/checkrun" xmlns:adtcore="http://www.sap.com/adt/core">` +
            `<chkrun:checkObject adtcore:uri="${escXml(objectUri)}" chkrun:version="${version}"/>` +
            `</chkrun:checkObjectList>`;
    return (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/checkruns', 'POST', 'default', body, { reporters: 'abapCheckRun' }, {
        Accept: 'application/vnd.sap.adt.checkmessages+xml, application/xml',
        'Content-Type': 'application/vnd.sap.adt.checkobjects+xml; charset=utf-8',
    });
}
/**
 * Build the ADT URI for an object from its name + type code, for use in an
 * activation objectReference. Mirrors adt-clients' internal buildObjectUri
 * (which the package does NOT export) and accepts both short codes (BDEF, CLAS)
 * and full codes (BDEF/BDO, CLAS/OC).
 */
function buildActivationUri(name, type) {
    const n = (0, utils_1.encodeSapObjectName)(name).toLowerCase();
    switch ((type || '').toUpperCase()) {
        case 'CLAS/OC':
        case 'CLAS':
            return `/sap/bc/adt/oo/classes/${n}`;
        case 'INTF/OI':
        case 'INTF':
            return `/sap/bc/adt/oo/interfaces/${n}`;
        case 'PROG/P':
        case 'PROG':
            return `/sap/bc/adt/programs/programs/${n}`;
        case 'FUGR':
        case 'FUGR/F':
        case 'FUNC':
            return `/sap/bc/adt/functions/groups/${n}`;
        case 'TABL/DT':
        case 'TABL':
            return `/sap/bc/adt/ddic/tables/${n}`;
        case 'TABL/DS':
        case 'STRU/DS':
        case 'STRU':
            return `/sap/bc/adt/ddic/structures/${n}`;
        case 'DDLS/DF':
        case 'DDLS':
            return `/sap/bc/adt/ddic/ddl/sources/${n}`;
        case 'VIEW/DV':
        case 'VIEW':
            return `/sap/bc/adt/ddic/views/${n}`;
        case 'DTEL/DE':
        case 'DTEL':
            return `/sap/bc/adt/ddic/dataelements/${n}`;
        case 'DOMA/DD':
        case 'DOMA':
            return `/sap/bc/adt/ddic/domains/${n}`;
        // TTYP/DA is the code a live system actually reports for a table type
        // (adtcore:type on a read of STRING_TABLE); it was missing here, so an
        // activation request built the fallback URI /sap/bc/adt/ttyp/da/<name>,
        // SAP found nothing to activate and answered activated:false with ZERO
        // messages — which the no-op rule then read as "already active".
        case 'TTYP/DA':
        case 'TTYP/DF':
        case 'TTYP/TT':
        case 'TTYP':
            return `/sap/bc/adt/ddic/tabletypes/${n}`;
        case 'SRVD/SRV':
        case 'SRVD':
            return `/sap/bc/adt/ddic/srvd/sources/${n}`;
        case 'SRVB/SVB':
        case 'SRVB':
            return `/sap/bc/adt/businessservices/bindings/${n}`;
        case 'DDLX/EX':
        case 'DDLX':
            return `/sap/bc/adt/ddic/ddlx/sources/${n}`;
        case 'BDEF/BDO':
        case 'BDEF':
            return `/sap/bc/adt/bo/behaviordefinitions/${n}`;
        case 'DCLS/DL':
        case 'DCLS':
            return `/sap/bc/adt/acm/dcl/sources/${n}`;
        case 'ENHO/ENH':
        case 'ENHO':
            return `/sap/bc/adt/enhancements/${n}`;
        case 'ENQU/DL':
        case 'ENQU':
            return `/sap/bc/adt/ddic/lockobjects/sources/${n}`;
        case 'XSLT/VT':
        case 'XSLT':
            return `/sap/bc/adt/xslt/transformations/${n}`;
        default:
            return `/sap/bc/adt/${(type || '').toLowerCase()}/${n}`;
    }
}
/**
 * Activate one or more objects via the SYNCHRONOUS ADT activation endpoint
 * (`/sap/bc/adt/activation`), which returns the activation result inline.
 *
 * This deliberately avoids adt-clients' `activateObjectsGroup`, which uses the
 * ASYNC `/activation/runs` endpoint and REQUIRES a `Location` header pointing to
 * `/activation/runs/{runId}`. Fast/synchronous activations (e.g. a single BDEF)
 * return the result inline with NO such header, so that path throws "Failed to
 * extract activation run ID from response headers". The synchronous endpoint —
 * the same one activate-in-session and every Update* handler already use — has
 * no run-ID step and works for both single objects and mixed-type groups.
 */
async function activateAdtObjects(connection, objects, preaudit = true) {
    const refs = objects
        .map((o) => {
        const uri = o.uri || buildActivationUri(o.name, o.type);
        const typeAttr = o.type ? ` adtcore:type="${escXml(o.type)}"` : '';
        return `<adtcore:objectReference adtcore:uri="${escXml(uri)}"${typeAttr} adtcore:name="${escXml(o.name)}"/>`;
    })
        .join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?>` +
        `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
        `${refs}` +
        `</adtcore:objectReferences>`;
    const res = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/activation', 'POST', 'long', body, { method: 'activate', preauditRequested: String(preaudit) }, { 'Content-Type': 'application/xml', Accept: 'application/xml' });
    return (0, utils_1.parseActivationResponse)(res.data);
}
/**
 * Activate a single object via the synchronous ADT activation endpoint, using
 * the explicit object URI (adt-clients' auto-URI map does not know these types).
 * Activation is stateless.
 */
async function activateAdt(connection, name, objectUri, preaudit = true) {
    return activateAdtObjects(connection, [{ name, type: '', uri: objectUri }], preaudit);
}
/**
 * Activate objects and report SAP's REAL outcome.
 *
 * This is the common finishing step for every Create/Update handler that
 * activates. It exists because the two obvious ways of reporting activation are
 * both wrong:
 *
 *   - echoing the caller's own `activate: true` flag (what most handlers did:
 *     `activated: shouldActivate`) reports success for an activation SAP
 *     refused — measured live, `UpdateStructure(activate:true)` claimed success
 *     for 9 of 9 DDL variants while only 2 actually activated;
 *   - trusting the dep's `activate()` wrappers, which POST and never parse the
 *     response body at all.
 *
 * Here the synchronous `/sap/bc/adt/activation` result is parsed and any
 * error-level message makes `success` false, so the handler can fail loudly.
 */
async function activateAndEvaluate(connection, objects, preaudit = true) {
    return (0, adtMessages_1.evaluateActivation)(await activateAdtObjects(connection, objects, preaudit));
}
/**
 * Activate one object by name+type and THROW a descriptive error when SAP
 * rejected it. For handlers whose contract is "activate or fail".
 */
async function activateOrThrow(connection, name, type, subject = `${type} ${name}`, preaudit = true) {
    const outcome = await activateAndEvaluate(connection, [{ name, type }], preaudit);
    if (!outcome.success) {
        throw new Error((0, adtMessages_1.describeActivation)(outcome, subject));
    }
    return outcome;
}
/**
 * Evaluate the RAW response that an adt-clients `activate()` wrapper returns.
 *
 * The dep's `activateObjectInSession` POSTs to /sap/bc/adt/activation and hands
 * back the axios response WITHOUT ever parsing it, so every handler that called
 * `client.getX().activate(...)` discarded SAP's verdict and then reported
 * `activated: <the caller's own activate flag>`. Feeding that same response
 * through here recovers the real outcome without changing the request flow (the
 * activation still happens in the dep's session, right after unlock).
 *
 * Accepts an axios response, a `{ activateResult }` wrapper, or a bare body.
 */
function evaluateActivationResponse(response) {
    const raw = response?.activateResult ?? response;
    const body = raw?.data ?? raw;
    return (0, adtMessages_1.evaluateActivation)((0, utils_1.parseActivationResponse)(body));
}
/**
 * Activate an object that was just written by a Create* / Update* handler, and
 * THROW when SAP refused it.
 *
 * WHY THIS EXISTS (field report round 3, K-1). Nine high-level handlers
 * called the dep's `activate()` wrapper and then built their result literal
 * unconditionally:
 *
 *     if (shouldActivate) await client.getMetadataExtension().activate({ name });
 *     const result = { success: true, message: `... updated and activated successfully` };
 *
 * Measured consequence on DM2/310: eight metadata extensions were written, all
 * eight reported "updated and activated successfully", and FIVE were never
 * activated (`@UI.facet` at entity level -> "Annotation 'UI.facet.id' used at
 * wrong position"). The same happened twice on UpdateBehaviorDefinition, where
 * a reported success left the ADT skeleton with `//persistent table <???>` in
 * the active version.
 *
 * The activation deliberately goes through our own synchronous
 * /sap/bc/adt/activation call rather than through `evaluateActivationResponse`
 * on the dep's return value, because the dep's wrappers do not agree on what
 * they return: domain and behaviorDefinition hand back the axios response,
 * while dataElement and serviceDefinition return a hand-built
 * `{ success, message }` object (including the literal
 * `{ success: false, message: 'Unknown activation status' }`). Parsing THAT as
 * an activation body yields zero messages, i.e. a silent success — the very
 * defect being fixed.
 */
async function activateWrittenObject(connection, name, type, subject, written) {
    const outcome = await activateAndEvaluate(connection, [{ name, type }]);
    if (!outcome.success) {
        throw new Error(`${subject} was ${written} but ACTIVATION FAILED: ` +
            `${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}. The object is left INACTIVE. ` +
            `Read it back with version='inactive', fix the source, then activate again.`);
    }
    return outcome;
}
/**
 * The activation-related response fields for a Create* / Update* handler.
 *
 * `status` used to be `shouldActivate ? 'active' : 'inactive'` — the caller's
 * own request flag echoed back in the position where a caller reads SAP's
 * verdict. Here it can only say 'active' when an activation actually succeeded.
 *
 * An activated:false with no messages is a no-op (SAP had nothing to activate
 * because the object was already active), which is why `activated` falls back
 * to the outcome verdict rather than to the raw flag alone.
 */
function writtenActivationFields(outcome) {
    if (!outcome) {
        return { activated: false, status: 'inactive' };
    }
    return {
        activated: outcome.activated === true || outcome.success,
        status: outcome.success ? 'active' : 'inactive',
        ...(outcome.warnings.length
            ? { activation_warnings: (0, adtMessages_1.formatAdtMessages)(outcome.warnings) }
            : {}),
    };
}
/**
 * Run a syntax check against SUBMITTED source and throw a positional error when
 * SAP rejects it.
 *
 * Replaces `client.getX().check(...)` in the pre-write path of the Update*
 * handlers. Two independent defects made that call actively harmful:
 *
 *  1. it discards the positions — see `src/lib/checkMessages.ts` for the cost;
 *  2. several per-type wrappers accept a source field in their config and then
 *     pass `undefined` for it (`AdtStructure.check` -> `checkStructure(...,
 *     undefined, ...)`), so "check my new code" silently degraded into "check
 *     the stored version". An object whose stored inactive version was broken
 *     could then never be repaired by an update: the pre-write check kept
 *     failing on the OLD source and aborted before the new source was written.
 *
 * `runObjectCheckRun` sends the source as an inline artifact, so the check is
 * always about what the caller is trying to write.
 */
async function checkSourceOrThrow(connection, objectUri, sourceCode, subject, version = 'inactive', artifactContentType = 'text/plain; charset=utf-8') {
    const response = await runObjectCheckRun(connection, objectUri, version, sourceCode, artifactContentType);
    const result = (0, checkMessages_1.parseCheckFindings)(response);
    if (result.has_errors) {
        throw new Error((0, checkMessages_1.describeCheckFailure)(result, subject));
    }
    return result;
}
/**
 * Run a check for a STANDALONE `Check*` tool and format the answer.
 *
 * WHY EVERY `Check*` GOES THROUGH HERE (field report round 6, F-2). The dependency's
 * per-type `check()` wrappers are wrong in three separate ways, and each one
 * produced a confident wrong answer rather than an error:
 *
 *   1. THEY THROW THE MESSAGES AWAY. `core/class/check.js` joins every message
 *      text with '; ' and throws — so twelve findings at twelve places arrive as
 *      twelve identical sentences with no positions. This is F-2 as reported.
 *   2. THEY THROW ON A CLEAN OBJECT. Their parser misreads a message-less
 *      `<chkrun:checkReport status="processed"/>` as `has_errors`, so a check of
 *      a perfectly good domain or data element ERRORS.
 *   3. THEY SILENTLY DROP THE SOURCE. `AdtStructure.check` and `AdtTable.check`
 *      both hardcode `undefined` where the caller's DDL belongs, while our own
 *      tool schemas advertise `ddl_code` and the handler even logs "with new
 *      code". So `CheckTable(ddl_code=…)` checked the version STORED in the
 *      system and reported that verdict as if it were about the submitted DDL —
 *      the same shape of lie as the activation verdicts in K-1, and not
 *      something the reporter had measured yet.
 *
 * Posting the checkrun ourselves fixes all three at once, so the family shares
 * this one function rather than fourteen near-copies.
 */
async function checkObjectAndReport(connection, request) {
    const result = (0, checkMessages_1.parseCheckFindings)(await runObjectCheckRun(connection, request.objectUri, request.version ?? 'active', request.sourceCode, request.artifactContentType));
    return {
        success: !result.has_errors && result.success !== false,
        message: (0, checkMessages_1.describeCheckOutcome)(result, request.subject),
        check_result: result,
        findings: (0, checkMessages_1.checkFindingsPayload)(result),
    };
}
//# sourceMappingURL=adtObjectOps.js.map