"use strict";
/**
 * DeleteTransport Handler - delete an (unreleased) transport request.
 *
 * Mirrors abap-adt-api's transportDelete:
 *   DELETE /sap/bc/adt/cts/transportrequests/{tr}
 *
 * Mutating: only works on modifiable (not yet released) requests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteTransport = handleDeleteTransport;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteTransport',
    available_in: ['onprem', 'cloud'],
    description: 'Delete a modifiable (not yet released) transport request. Fails if the request has already been released.',
    inputSchema: {
        type: 'object',
        properties: {
            transport_number: {
                type: 'string',
                description: 'Transport request number to delete, e.g. ABCK900001.',
            },
        },
        required: ['transport_number'],
    },
};
async function handleDeleteTransport(context, args) {
    const { connection, logger } = context;
    try {
        const transport_number = args?.transport_number;
        if (!transport_number) {
            return (0, utils_1.return_error)(new Error('transport_number is required'));
        }
        const tr = transport_number.toUpperCase();
        logger?.info(`DeleteTransport: ${tr}`);
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/cts/transportrequests/${tr}`, 'DELETE', 'default', undefined, undefined, { Accept: 'application/*' });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                transport_number: tr,
                message: `Transport ${tr} deleted`,
            }),
        });
    }
    catch (error) {
        logger?.error(`DeleteTransport failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleDeleteTransport.js.map