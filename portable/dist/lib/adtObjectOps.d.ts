/**
 * Generic ADT object operations via direct makeAdtRequest.
 *
 * Used by object types that the @mcp-abap-adt/adt-clients package does NOT
 * support (message class / MSAG, lock object / ENQU, transformation / XSLT).
 * These endpoints exist in ADT (confirmed via /sap/bc/adt/discovery on S/4
 * 7.56) but have no client wrapper, so we drive lock / unlock / activate /
 * delete / source read+write directly — the same approach handleCreateView and
 * the P6 CreatePackage direct-POST path already use.
 *
 * Stateful continuity: lock + mutate + unlock MUST share one server session, or
 * SAP registers the lock in one session and rejects the mutate from another
 * ("… is currently editing …"). Per-request `x-sap-adt-sessiontype: stateful`
 * headers are NOT enough — the connection must be switched to stateful mode
 * (`setSessionType`) so it replays the session cookie across calls. runLocked
 * handles that (and always restores stateless afterwards).
 *
 * All requests inherit the P1 sap-language pinning because callers first run
 * createAdtClient(connection) (idempotent connection wrapper) before using
 * these helpers.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { type ActivationOutcome } from './adtMessages';
import { parseCheckFindings } from './checkMessages';
import { makeAdtRequestWithTimeout, parseActivationResponse } from './utils';
/** Switch the connection's session mode (no-op if unsupported). */
export declare function setSessionMode(connection: IAbapConnection, mode: 'stateful' | 'stateless'): void;
export declare function runExclusive<T>(_connection: IAbapConnection, fn: () => Promise<T>): Promise<T>;
/** Escape a string for use in an XML attribute or text node. */
export declare function escXml(str: string): string;
/** GET an object (or its source) by URL. Returns the raw body string. */
export declare function getAdt(connection: IAbapConnection, url: string, params?: Record<string, string>): Promise<string>;
/** Lock an object. Requires the connection to already be in stateful mode. */
export declare function lockAdt(connection: IAbapConnection, objectUrl: string, 
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
language?: string): Promise<string>;
/** Unlock an object (best-effort; never throws). */
export declare function unlockAdt(connection: IAbapConnection, objectUrl: string, lockHandle: string): Promise<void>;
/**
 * Run `work` while holding a MODIFY lock inside a single stateful session.
 * Switches the connection to stateful for the duration, then always unlocks
 * and restores stateless mode.
 */
export declare function runLocked<T>(connection: IAbapConnection, objectUrl: string, work: (lockHandle: string) => Promise<T>, 
/** Session language for the lock — see lockAdt. */
language?: string, logger?: {
    debug?: (m: string) => void;
    warn?: (m: string) => void;
}): Promise<T>;
/** PUT full object XML content (structured objects: MSAG, ENQU). */
export declare function putAdtContent(connection: IAbapConnection, objectUrl: string, xml: string, lockHandle: string, transport?: string, 
/**
 * Overrides the `sap-language` the connection wrapper would otherwise inject.
 * Pass the SAME value the lock was taken with — the lock decides the row, this
 * only keeps the request consistent with it.
 */
language?: string): Promise<void>;
/** PUT plain-text source (source-based objects: XSLT). */
export declare function putAdtSource(connection: IAbapConnection, sourceUrl: string, source: string, lockHandle: string, transport?: string): Promise<void>;
/** DELETE an object (lock must be held in the current stateful session). */
export declare function deleteAdt(connection: IAbapConnection, objectUrl: string, lockHandle: string, transport?: string): Promise<void>;
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
export declare function runObjectCheckRun(connection: IAbapConnection, objectUri: string, version?: 'active' | 'inactive' | 'new', sourceCode?: string, artifactContentType?: string): Promise<Awaited<ReturnType<typeof makeAdtRequestWithTimeout>>>;
/**
 * Build the ADT URI for an object from its name + type code, for use in an
 * activation objectReference. Mirrors adt-clients' internal buildObjectUri
 * (which the package does NOT export) and accepts both short codes (BDEF, CLAS)
 * and full codes (BDEF/BDO, CLAS/OC).
 */
export declare function buildActivationUri(name: string, type: string): string;
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
export declare function activateAdtObjects(connection: IAbapConnection, objects: Array<{
    name: string;
    type: string;
    uri?: string;
}>, preaudit?: boolean): Promise<ReturnType<typeof parseActivationResponse>>;
/**
 * Activate a single object via the synchronous ADT activation endpoint, using
 * the explicit object URI (adt-clients' auto-URI map does not know these types).
 * Activation is stateless.
 */
export declare function activateAdt(connection: IAbapConnection, name: string, objectUri: string, preaudit?: boolean): Promise<ReturnType<typeof parseActivationResponse>>;
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
export declare function activateAndEvaluate(connection: IAbapConnection, objects: Array<{
    name: string;
    type: string;
    uri?: string;
}>, preaudit?: boolean): Promise<ActivationOutcome>;
/**
 * Activate one object by name+type and THROW a descriptive error when SAP
 * rejected it. For handlers whose contract is "activate or fail".
 */
export declare function activateOrThrow(connection: IAbapConnection, name: string, type: string, subject?: string, preaudit?: boolean): Promise<ActivationOutcome>;
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
export declare function evaluateActivationResponse(response: any): ActivationOutcome;
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
export declare function activateWrittenObject(connection: IAbapConnection, name: string, type: string, subject: string, written: 'created' | 'updated'): Promise<ActivationOutcome>;
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
export declare function writtenActivationFields(outcome?: ActivationOutcome): Record<string, unknown>;
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
export declare function checkSourceOrThrow(connection: IAbapConnection, objectUri: string, sourceCode: string, subject: string, version?: 'active' | 'inactive', artifactContentType?: string): Promise<ReturnType<typeof parseCheckFindings>>;
export interface CheckObjectReport {
    /** True when the run produced no error-level message. */
    success: boolean;
    /** One line, positions included — see `describeCheckOutcome`. */
    message: string;
    check_result: ReturnType<typeof parseCheckFindings>;
    /** Collapsed, position-carrying findings for a caller that parses. */
    findings: Record<string, unknown>;
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
export declare function checkObjectAndReport(connection: IAbapConnection, request: {
    objectUri: string;
    subject: string;
    version?: 'active' | 'inactive' | 'new';
    sourceCode?: string;
    artifactContentType?: string;
}): Promise<CheckObjectReport>;
//# sourceMappingURL=adtObjectOps.d.ts.map