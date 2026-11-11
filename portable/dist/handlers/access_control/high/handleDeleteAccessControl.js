"use strict";
/**
 * DeleteAccessControl Handler - Delete a DCL source.
 *
 * Uses the shared deletion API (`/sap/bc/adt/deletion/delete`, object-type
 * agnostic) so SAP's own `del:isDeleted` and every `del:message` survive, then
 * VERIFIES against the system that the object is really gone. The dep's
 * `deleteAccessControl()` cannot be used for this: it overwrites the response
 * body with a hardcoded `{ success: true, message: "… deleted successfully" }`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteAccessControl = handleDeleteAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteAccessControl',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Delete. Subject: Access Control (DCL / DCLS). Delete a DCL source from the SAP ' +
        'system. The deletion is verified against the system afterwards, so a refusal is reported as ' +
        'a failure with SAP’s own reason rather than as success.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable objects; omit for $TMP.',
            },
        },
        required: ['access_control_name'],
    },
};
async function handleDeleteAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name) {
            return (0, utils_1.return_error)(new Error('access_control_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        const uri = (0, accessControlXml_1.accessControlUri)(name);
        const result = await (0, adtDeletion_1.deleteAdtObjectWithMessages)(connection, uri, args.transport_request);
        if (!result.isDeleted) {
            const detail = result.messages.length
                ? (0, adtMessages_1.formatAdtMessages)(result.messages)
                : 'SAP reported the object was not deleted (no message returned).';
            return (0, utils_1.return_error)(new Error(`Failed to delete access control ${name}: ${detail}`));
        }
        // GROUND TRUTH: ask the system, do not trust the delete call's own report.
        const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, uri, `Access control ${name}`, result.messages);
        if (deletionFailure) {
            return (0, utils_1.return_error)(new Error(deletionFailure));
        }
        logger?.info(`Access control deleted: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                access_control_name: name,
                transport_request: args.transport_request || null,
                messages: result.messages,
                message: `Access control ${name} deleted successfully.`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const bodyText = error?.response?.data
            ? typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
            : '';
        let msg = `Error deleting access control ${args?.access_control_name}: ${error instanceof Error ? error.message : String(error)}`;
        if (error?.response?.status === 404) {
            msg = `Access control ${args?.access_control_name?.toUpperCase()} not found. It may already be deleted.`;
        }
        else if (error?.response?.status === 423) {
            msg = `Access control ${args?.access_control_name?.toUpperCase()} is locked by an existing edit session — clear it in SM12 or wait for it to expire.`;
        }
        else if (bodyText) {
            msg += ` | ADT: ${bodyText.slice(0, 1000)}`;
        }
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleDeleteAccessControl.js.map