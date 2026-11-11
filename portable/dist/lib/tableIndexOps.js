"use strict";
/**
 * Operations shared by the table-index handlers.
 *
 * The awkward part of an index is not the payload, it is the ACTIVATION ORDER.
 * An index and its table are mutually dependent:
 *
 *   - activating the index alone fails: `Table ... is not active in ABAP Dictionary`
 *   - activating the table while the index has no fields fails:
 *     `[E] Index <TAB>-<ID> does not contain fields` — so a half-created index
 *     does not merely sit there, it BREAKS the table's activation
 *
 * Passing both object references in ONE activation call succeeds. Every write
 * here therefore activates the pair together, and a create that cannot be
 * completed removes the shell it made rather than leaving the table unactivatable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTableIndexSource = writeTableIndexSource;
exports.activateIndexWithTable = activateIndexWithTable;
exports.removeIndexShell = removeIndexShell;
const adtDeletion_1 = require("./adtDeletion");
const adtMessages_1 = require("./adtMessages");
const adtObjectOps_1 = require("./adtObjectOps");
const tableIndexXml_1 = require("./tableIndexXml");
const utils_1 = require("./utils");
/** Write an index's JSON source (the field list) under a lock. */
async function writeTableIndexSource(connection, tableName, indexId, source, transportRequest) {
    const uri = (0, tableIndexXml_1.tableIndexUri)(tableName, indexId);
    await (0, adtObjectOps_1.runLocked)(connection, uri, async (lockHandle) => {
        const params = { lockHandle };
        if (transportRequest)
            params.corrNr = transportRequest;
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, `${uri}/source/main`, 'PUT', 'default', source, params, { 'Content-Type': tableIndexXml_1.CT_TABLE_INDEX_SOURCE });
    });
}
/**
 * Activate an index together with its table — the only order that works.
 *
 * Success is decided from the MESSAGES, not from the activated/checked flags:
 * SAP sets `activationExecuted="true"` even for objects it rejected, and this
 * endpoint was observed reporting `activated:true, checked:true` alongside
 * E-level messages saying the activation was cancelled.
 */
async function activateIndexWithTable(connection, tableName, indexId) {
    const raw = await (0, adtObjectOps_1.activateAdtObjects)(connection, [
        {
            uri: (0, tableIndexXml_1.tableUri)(tableName),
            name: tableName.toUpperCase(),
            type: 'TABL/DT',
        },
        {
            uri: (0, tableIndexXml_1.tableIndexUri)(tableName, indexId),
            name: (0, tableIndexXml_1.tableIndexName)(tableName, indexId),
            type: tableIndexXml_1.TABLE_INDEX_TYPE,
        },
    ]);
    const outcome = (0, adtMessages_1.evaluateActivation)(raw);
    return {
        success: outcome.success,
        activated: outcome.activated,
        checked: outcome.checked,
        messages: outcome.messages,
        errors: outcome.errors,
        description: outcome.success
            ? `Index ${(0, tableIndexXml_1.tableIndexName)(tableName, indexId)} and table ${tableName.toUpperCase()} activated`
            : `Activation FAILED: ${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}`,
    };
}
/**
 * Best-effort removal of an index shell.
 *
 * Used when a create cannot be finished. This is not tidiness: an index with no
 * fields makes its own table refuse to activate, so leaving the shell behind
 * would hand back a broken table.
 */
async function removeIndexShell(connection, tableName, indexId, transportRequest) {
    const uri = (0, tableIndexXml_1.tableIndexUri)(tableName, indexId);
    try {
        const result = await (0, adtDeletion_1.deleteAdtObjectWithMessages)(connection, uri, transportRequest);
        // Existence decides, not SAP's flag: the index deletion endpoint answers
        // isDeleted="false" with a database-error message for deletes that in fact
        // succeeded. Believing the flag here left the shell "un-removable" and so
        // reported a broken table that was actually fine.
        const stillThere = await (0, adtDeletion_1.adtObjectExists)(connection, uri).catch(() => undefined);
        if (stillThere === false)
            return null;
        if (stillThere === undefined && result.isDeleted)
            return null;
        throw new Error((0, adtMessages_1.formatAdtMessages)(result.messages) || 'the object is still present');
    }
    catch (error) {
        return (`The incomplete index ${(0, tableIndexXml_1.tableIndexName)(tableName, indexId)} could NOT be removed (${error?.message || error}). It has no fields, which ` +
            `will make table ${tableName.toUpperCase()} fail to activate — delete it with ` +
            'DeleteTableIndex or in SE11.');
    }
}
//# sourceMappingURL=tableIndexOps.js.map