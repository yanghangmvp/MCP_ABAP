"use strict";
/**
 * DeleteMessageClass Handler - Delete an ABAP message class (MSAG).
 * Workflow: lock -> DELETE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteMessageClass = handleDeleteMessageClass;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteMessageClass',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Delete. Subject: MessageClass. Delete an ABAP message class (MSAG) from the SAP system.',
    inputSchema: {
        type: 'object',
        properties: {
            message_class_name: {
                type: 'string',
                description: 'Message class name.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable objects; optional for $TMP.',
            },
        },
        required: ['message_class_name'],
    },
};
async function handleDeleteMessageClass(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.message_class_name)
            return (0, utils_1.return_error)(new Error('message_class_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.message_class_name.toUpperCase();
        const url = `/sap/bc/adt/messageclass/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        await (0, adtObjectOps_1.runLocked)(connection, url, async (lockHandle) => {
            await (0, adtObjectOps_1.deleteAdt)(connection, url, lockHandle, args.transport_request);
        });
        // GROUND TRUTH: verify the object is really gone rather than trusting
        // that the DELETE returned without throwing. Same reason the other
        // Delete* handlers verify — a deletion SAP declined must not be
        // reported as success, or the next run fails with a misleading
        // "already exists".
        const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, url, `Message class ${name}`);
        if (deletionFailure) {
            throw new Error(deletionFailure);
        }
        logger?.info(`Message class deleted: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                message_class_name: name,
                message: `Message class ${name} deleted successfully.`,
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
        const msg = `Error deleting message class ${args?.message_class_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleDeleteMessageClass.js.map