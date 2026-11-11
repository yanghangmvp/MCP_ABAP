"use strict";
/**
 * DeleteTableType Handler — delete an ABAP table type (TTYP).
 *
 * Counterpart to CreateTableType; table types previously had no delete tool
 * either, so test/scratch table types could not be cleaned up through the MCP.
 *
 * Deletion goes through the shared `/sap/bc/adt/deletion/delete` helper so
 * SAP's own `isDeleted` verdict and every `del:message` reach the caller, and
 * the result is then VERIFIED against the system — ADT answers HTTP 200 when it
 * refuses a deletion, so "it returned" is never proof that the object is gone.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteTableType = handleDeleteTableType;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const tableTypeXml_1 = require("../../../lib/tableTypeXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteTableType',
    available_in: ['onprem', 'cloud'],
    description: "Operation: Delete. Subject: Table type (TTYP). Delete an ABAP table type. Fails with SAP's own reason (and verifies the object is really gone) when the deletion is refused — e.g. while a structure still references the table type.",
    inputSchema: {
        type: 'object',
        properties: {
            table_type_name: {
                type: 'string',
                description: 'Table type name (e.g., ZTT_ORDER_ITEM).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable packages; leave empty for $TMP.',
            },
        },
        required: ['table_type_name'],
    },
};
async function handleDeleteTableType(context, args) {
    const { connection, logger } = context;
    const name = (args?.table_type_name || '').toUpperCase();
    try {
        if (!args?.table_type_name) {
            return (0, utils_1.return_error)(new Error('table_type_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const uri = (0, tableTypeXml_1.tableTypeUri)(name);
        const transport = args.transport_request?.trim() || undefined;
        (0, adtObjectOps_1.setSessionMode)(connection, 'stateless');
        const deletion = await (0, adtDeletion_1.deleteAdtObjectWithMessages)(connection, uri, transport);
        if (!deletion.isDeleted) {
            return (0, utils_1.return_error)(new Error(`Failed to delete table type ${name}: ` +
                ((0, adtMessages_1.formatAdtMessages)(deletion.messages) ||
                    'SAP reported isDeleted=false without a message')));
        }
        // Ground truth: ask the system whether it is really gone.
        const failure = await (0, adtDeletion_1.describeFailedDeletion)(connection, uri, `Table type ${name}`, deletion.messages);
        if (failure)
            return (0, utils_1.return_error)(new Error(failure));
        logger?.info(`Table type deleted: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                table_type_name: name,
                transport_request: transport || null,
                messages: deletion.messages.length ? deletion.messages : undefined,
                message: `Table type ${name} deleted successfully.`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const status = error?.response?.status;
        let msg = `Failed to delete table type ${name}: ${error?.message || String(error)}`;
        if (status === 404) {
            msg = `Table type ${name} not found. It may already be deleted.`;
        }
        else if (status === 423) {
            msg = `Table type ${name} is locked by another user or an open edit session. Cannot delete.`;
        }
        else if (status === 400) {
            msg = `Bad request deleting table type ${name}. Check whether a transport request is required and valid.`;
        }
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleDeleteTableType.js.map