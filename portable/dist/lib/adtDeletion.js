"use strict";
/**
 * Object deletion via ADT's deletion API, with SAP's real result relayed —
 * plus a post-delete existence verification.
 *
 * WHY THIS EXISTS — deletion is the worst of the "silent false success" cases:
 *
 * 1. `@mcp-abap-adt/adt-clients` **fabricates** a success payload. Its
 *    `deleteStructure()` (core/structure/delete.js) spreads the real response
 *    and then OVERWRITES `data` with a hardcoded
 *    `{ success: true, message: "<X> deleted successfully" }`, so SAP's own
 *    `del:deletionResult` — including `del:isDeleted="false"` and the
 *    `del:message` list explaining WHY — never reaches the caller.
 * 2. `AdtStructure.delete()` calls `checkDeletion()` first (good) but never
 *    inspects its response, logging "Deletion check passed" regardless.
 * 3. The handlers then tested only `if (!deleteResult) throw`, i.e. that a
 *    response object exists, and reported `success: true`.
 *
 * Observed live: three `$TMP` structures reported "deleted successfully" twice
 * each while remaining in DD02L with AS4LOCAL='A'. (Common trait: a QUAN field
 * referencing the object's own unit field, so the dependency check considered
 * the object still referenced.) Batch cleanups therefore silently left objects
 * behind, and the next run failed with a misleading "already exists".
 *
 * `/sap/bc/adt/deletion/delete` is object-type agnostic — it takes the object
 * URI — so one implementation serves every DDIC type. Same in-repo-bypass
 * pattern as activateAdtObjects / runObjectCheckRun / the synchronous
 * unit-test run.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeletionXml = buildDeletionXml;
exports.parseDeletionResult = parseDeletionResult;
exports.deleteAdtObjectWithMessages = deleteAdtObjectWithMessages;
exports.checkAdtDeletionAllowed = checkAdtDeletionAllowed;
exports.adtObjectExists = adtObjectExists;
exports.describeFailedDeletion = describeFailedDeletion;
exports.removePartialCreation = removePartialCreation;
const fast_xml_parser_1 = require("fast-xml-parser");
const adtMessages_1 = require("./adtMessages");
const utils_1 = require("./utils");
const CT_DELETION_REQUEST = 'application/vnd.sap.adt.deletion.request.v1+xml';
const ACCEPT_DELETION_RESPONSE = 'application/vnd.sap.adt.deletion.response.v1+xml';
const CT_DELETION_CHECK = 'application/vnd.sap.adt.deletion.check.request.v1+xml';
const ACCEPT_DELETION_CHECK = 'application/vnd.sap.adt.deletion.check.response.v1+xml';
function arr(x) {
    if (x == null)
        return [];
    return Array.isArray(x) ? x : [x];
}
/** Build the ADT `deletionRequest` body for an arbitrary object URI. */
function buildDeletionXml(objectUri, transportRequest) {
    // SAP wants a transportNumber tag either way: the value when transportable,
    // otherwise an empty self-closing tag (omitting it entirely fails for some
    // DDIC types).
    const transportTag = transportRequest?.trim()
        ? `<del:transportNumber>${transportRequest.trim()}</del:transportNumber>`
        : '<del:transportNumber/>';
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<del:deletionRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">` +
        `<del:object adtcore:uri="${objectUri}">${transportTag}</del:object>` +
        `</del:deletionRequest>`);
}
/**
 * Parse a `del:deletionResult` (or `del:checkResult`) response into
 * `{ isDeleted, messages }`. Namespace prefixes are stripped and `del:message`
 * is coerced to an array, so both a single message and a message list are
 * captured — the dep's single-message assumption is what collapsed real
 * multi-message failures into a generic "Deletion failed".
 *
 * MULTIPLE `del:object` ELEMENTS ARE NORMAL. A deletion can cascade: deleting a
 * table index also removes the table's technical-settings object, and SAP then
 * answers with one `del:object` per affected object. Reading `.object` as a
 * single node in that case yields an ARRAY, so `@_isDeleted` and `message` are
 * both `undefined` — which reported `isDeleted: false` with NO messages, i.e.
 * "the deletion failed and SAP gave no reason", for a deletion that had actually
 * happened. Measured on DM2/310 while deleting a table index.
 *
 * When several objects are reported, `isDeleted` is the verdict for the object
 * the caller asked about (matched on the URI), and `messages` carries every
 * message from every object so nothing is lost. `optionalTargetUri` lets the
 * caller name that object; without it the first entry is used.
 */
function parseDeletionResult(response, optionalTargetUri) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
    });
    const data = typeof response?.data === 'string'
        ? parser.parse(response.data)
        : response?.data;
    const readMessages = (node) => arr(node?.message)
        .map((m) => {
        const text = typeof m?.text === 'string' ? m.text : (m?.text?.['#text'] ?? '');
        return { type: m?.['@_type'], text: String(text) };
    })
        .filter((m) => m.text);
    const nodes = arr(data?.deletionResult?.object ?? data?.checkResult?.object);
    const objects = nodes.map((node) => ({
        uri: String(node?.['@_uri'] ?? ''),
        type: String(node?.['@_type'] ?? ''),
        isDeleted: node?.['@_isDeleted'] === 'true' || node?.['@_isDeleted'] === true,
        messages: readMessages(node),
    }));
    // The target is the object the caller named; fall back to the first entry.
    const normalise = (uri) => decodeURIComponent(uri).toLowerCase();
    const target = optionalTargetUri
        ? (objects.find((o) => normalise(o.uri) === normalise(optionalTargetUri)) ??
            objects[0])
        : objects[0];
    const messages = objects.flatMap((o) => o.messages);
    const { errors } = (0, adtMessages_1.classifyAdtMessages)(messages);
    return {
        isDeleted: target?.isDeleted === true,
        messages,
        errors,
        status: response?.status ?? 0,
        ...(objects.length > 1 ? { objects } : {}),
    };
}
/**
 * POST `/sap/bc/adt/deletion/delete` for one object and return SAP's verdict
 * plus every message. Transport/HTTP errors (a genuine 404, 423 lock, …) throw
 * and are handled by the caller.
 */
async function deleteAdtObjectWithMessages(connection, objectUri, transportRequest) {
    const response = (await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/deletion/delete', 'POST', 'default', buildDeletionXml(objectUri, transportRequest), undefined, {
        'Content-Type': CT_DELETION_REQUEST,
        Accept: ACCEPT_DELETION_RESPONSE,
    }));
    // Name the target so a cascading deletion's extra del:object entries cannot
    // decide the verdict for us.
    return parseDeletionResult(response, objectUri);
}
/**
 * Ask ADT whether the object may be deleted (`/sap/bc/adt/deletion/check`).
 * Used to surface the ACTIONABLE reason when a delete turns out to have been
 * refused — e.g. "still used by <object>". Never throws: a failing check must
 * not mask the deletion outcome we are trying to explain.
 */
async function checkAdtDeletionAllowed(connection, objectUri) {
    try {
        const body = `<?xml version="1.0" encoding="UTF-8"?>` +
            `<del:checkRequest xmlns:del="http://www.sap.com/adt/deletion" xmlns:adtcore="http://www.sap.com/adt/core">` +
            `<del:object adtcore:uri="${objectUri}"/>` +
            `</del:checkRequest>`;
        const response = (await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/deletion/check', 'POST', 'default', body, undefined, {
            'Content-Type': CT_DELETION_CHECK,
            Accept: ACCEPT_DELETION_CHECK,
        }));
        return parseDeletionResult(response).messages;
    }
    catch {
        return [];
    }
}
/**
 * Does the object still exist? A GET on its URI answering 404 (or 403 "does
 * not exist") means really gone. Any transport-level failure returns
 * `undefined` = "could not determine", so an unrelated network problem is never
 * reported as a failed deletion.
 */
async function adtObjectExists(connection, objectUri) {
    try {
        const res = (await (0, utils_1.makeAdtRequestWithTimeout)(connection, objectUri, 'GET', 'default'));
        const status = res?.status ?? 0;
        if (status === 404)
            return false;
        if (status >= 200 && status < 300)
            return true;
        return undefined;
    }
    catch (error) {
        const status = error?.response?.status;
        if (status === 404)
            return false;
        // 403 on a nonexistent object happens on some releases for DDIC reads.
        const body = typeof error?.response?.data === 'string' ? error.response.data : '';
        if (status === 403 && /does not exist|not found/i.test(body))
            return false;
        // Anything else (400 on a malformed name, 5xx, network) tells us nothing.
        return undefined;
    }
}
/**
 * Verify that a deletion actually took effect, and build the failure message if
 * it did not. Returns `null` when the object is confirmed gone (or when
 * existence could not be determined — we never invent a failure); otherwise a
 * ready-to-throw explanation including SAP's reasons.
 *
 * This is the ground-truth step: it asks the system rather than trusting the
 * delete call's own report.
 */
async function describeFailedDeletion(connection, objectUri, subject, knownMessages = []) {
    const stillExists = await adtObjectExists(connection, objectUri);
    if (stillExists !== true)
        return null;
    const messages = [...knownMessages];
    if (messages.length === 0) {
        messages.push(...(await checkAdtDeletionAllowed(connection, objectUri)));
    }
    const detail = messages.length
        ? ` SAP reported: ${(0, adtMessages_1.formatAdtMessages)(messages)}`
        : ' SAP returned no explanation; check the object in SE11/SE80 for remaining' +
            ' dependencies (a self-referencing unit/currency field is one known cause).';
    return `${subject} was NOT deleted — it still exists after the deletion request.${detail}`;
}
/**
 * Clean up after a `Create*` that failed AFTER the object was registered in SAP
 * — or, failing that, say what was left behind.
 *
 * WHY (field report round 1 I-4, still open in round 6 as F-4). Measured on DM2/310:
 *
 *     CreateDataElement ZMY_PROBE_DTEL, type_kind=domain,
 *                       type_name=ZNO_SUCH_DOMAIN_XX
 *       -> ERROR "No active domain ZNO_SUCH_DOMAIN_XX available"
 *     GetInactiveObjects(name_prefix='ZMY')
 *       -> ZMY_PROBE_DTEL  DTEL/DE   still there, inactive
 *
 * The call was HONEST — it reported the error — and still left an object
 * behind. That matters because an inactive shell in a package blocks later
 * activations in that package and nothing reports it except a sweep, so a
 * project that does not sweep accumulates them silently.
 *
 * THE OUTCOME IS NEVER INVENTED. The object is read back before and after: if
 * it is not there, nothing is claimed; if the removal fails or cannot be
 * confirmed, the message NAMES the object so the caller can delete it. As the
 * reporter put it — silence is the only outcome they cannot work with.
 *
 * Callers must only invoke this when their own create call actually succeeded.
 * A failure at the validate stage never wrote anything, and deleting on that
 * path could remove an object this call did not create.
 */
async function removePartialCreation(connection, options) {
    const { objectUri, objectLabel, transportRequest, logger } = options;
    const retryHint = options.retryHint ?? 'delete it before retrying.';
    try {
        const before = await adtObjectExists(connection, objectUri);
        if (before === false)
            return '';
        if (before === undefined) {
            return (`; could not determine whether ${objectLabel} was left behind — ` +
                `check with GetInactiveObjects, then ${retryHint}`);
        }
        const result = await deleteAdtObjectWithMessages(connection, objectUri, transportRequest);
        // Ground truth, not the delete call's own report: this endpoint answers
        // isDeleted="false" for deletions that succeeded (see describeFailedDeletion).
        const after = await adtObjectExists(connection, objectUri);
        if (after === false) {
            logger?.debug?.(`Removed partially created ${objectLabel}`);
            return `; the partially created ${objectLabel} was removed`;
        }
        const why = result.messages.length
            ? ` (${result.messages
                .map((m) => m.text)
                .filter(Boolean)
                .join('; ')})`
            : '';
        return `; ${objectLabel} was created and left INACTIVE${why} — ${retryHint}`;
    }
    catch (cleanupError) {
        // The original failure is the answer; this must never replace it.
        logger?.warn?.(`Cleanup of ${objectLabel} failed: ${cleanupError?.message || cleanupError}`);
        return `; ${objectLabel} was created and left INACTIVE — ${retryHint}`;
    }
}
//# sourceMappingURL=adtDeletion.js.map