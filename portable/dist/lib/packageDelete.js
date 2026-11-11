"use strict";
/**
 * Package deletion via ADT's deletion API — in-repo bypass of the adt-clients dep.
 *
 * `@mcp-abap-adt/adt-clients` getPackage().delete() throws a generic
 * "Package deletion failed: Deletion failed": it reads `del:message.del:text`
 * assuming a SINGLE message, so when SAP returns an ARRAY of messages (the usual
 * case for a real failure — no TADIR record, locked in a transport, package not
 * empty, …) the text is lost and replaced by the fallback string.
 *
 * The request/response handling now lives in `./adtDeletion` (the same endpoint
 * serves every object type); this module keeps the package-specific URI shape
 * and its own exported names so existing callers/tests are unaffected.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPackageDeletionXml = buildPackageDeletionXml;
exports.parsePackageDeletionResult = parsePackageDeletionResult;
exports.deletePackageWithMessages = deletePackageWithMessages;
const adtDeletion_1 = require("./adtDeletion");
const utils_1 = require("./utils");
/** ADT URI of a package. */
function packageUri(packageName) {
    return `/sap/bc/adt/packages/${(0, utils_1.encodeSapObjectName)(packageName).toLowerCase()}`;
}
/** Build the ADT deletionRequest body for a package. */
function buildPackageDeletionXml(packageName, transportRequest) {
    return (0, adtDeletion_1.buildDeletionXml)(packageUri(packageName), transportRequest);
}
/**
 * Parse a `del:deletionResult` response into { isDeleted, messages }. Namespace
 * prefixes are stripped, and `del:message` is coerced to an array so a single
 * message and a message array are both captured.
 */
function parsePackageDeletionResult(response) {
    const { isDeleted, messages, status } = (0, adtDeletion_1.parseDeletionResult)(response);
    return { isDeleted, messages, status };
}
/**
 * Delete a package via `/sap/bc/adt/deletion/delete` and return SAP's own
 * result (isDeleted + every message). Throws on transport/HTTP errors (e.g. a
 * genuine 404) — the caller handles those separately.
 */
async function deletePackageWithMessages(connection, packageName, transportRequest) {
    const { isDeleted, messages, status } = await (0, adtDeletion_1.deleteAdtObjectWithMessages)(connection, packageUri(packageName), transportRequest);
    return { isDeleted, messages, status };
}
//# sourceMappingURL=packageDelete.js.map