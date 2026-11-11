"use strict";
/**
 * DeleteXslt Handler - Delete an ABAP transformation. Workflow: lock -> DELETE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteXslt = handleDeleteXslt;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteXslt',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Delete. Subject: Transformation (XSLT). Delete an ABAP transformation from the SAP system.',
    inputSchema: {
        type: 'object',
        properties: {
            xslt_name: { type: 'string', description: 'Transformation name.' },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable objects; optional for $TMP.',
            },
        },
        required: ['xslt_name'],
    },
};
async function handleDeleteXslt(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.xslt_name)
            return (0, utils_1.return_error)(new Error('xslt_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.xslt_name.toUpperCase();
        const base = `/sap/bc/adt/xslt/transformations/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        await (0, adtObjectOps_1.runLocked)(connection, base, async (lockHandle) => {
            await (0, adtObjectOps_1.deleteAdt)(connection, base, lockHandle, args.transport_request);
        });
        // GROUND TRUTH: verify the object is really gone rather than trusting
        // that the DELETE returned without throwing. Same reason the other
        // Delete* handlers verify — a deletion SAP declined must not be
        // reported as success, or the next run fails with a misleading
        // "already exists".
        const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, base, `Transformation ${name}`);
        if (deletionFailure) {
            throw new Error(deletionFailure);
        }
        logger?.info(`Transformation deleted: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                xslt_name: name,
                message: `Transformation ${name} deleted successfully.`,
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
        const msg = `Error deleting transformation ${args?.xslt_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleDeleteXslt.js.map