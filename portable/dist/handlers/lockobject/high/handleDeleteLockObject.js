"use strict";
/**
 * DeleteLockObject Handler - Delete an ABAP lock object (ENQU). Workflow: lock -> DELETE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteLockObject = handleDeleteLockObject;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteLockObject',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Delete. Subject: LockObject (ENQU). Delete an ABAP lock object from the SAP system.',
    inputSchema: {
        type: 'object',
        properties: {
            lock_object_name: { type: 'string', description: 'Lock object name.' },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable objects; optional for $TMP.',
            },
        },
        required: ['lock_object_name'],
    },
};
async function handleDeleteLockObject(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.lock_object_name)
            return (0, utils_1.return_error)(new Error('lock_object_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.lock_object_name.toUpperCase();
        const url = `/sap/bc/adt/ddic/lockobjects/sources/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        await (0, adtObjectOps_1.runLocked)(connection, url, async (lockHandle) => {
            await (0, adtObjectOps_1.deleteAdt)(connection, url, lockHandle, args.transport_request);
        });
        // GROUND TRUTH: verify the object is really gone rather than trusting
        // that the DELETE returned without throwing. Same reason the other
        // Delete* handlers verify — a deletion SAP declined must not be
        // reported as success, or the next run fails with a misleading
        // "already exists".
        const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, url, `Lock object ${name}`);
        if (deletionFailure) {
            throw new Error(deletionFailure);
        }
        logger?.info(`Lock object deleted: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                lock_object_name: name,
                message: `Lock object ${name} deleted successfully.`,
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
        const msg = `Error deleting lock object ${args?.lock_object_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleDeleteLockObject.js.map