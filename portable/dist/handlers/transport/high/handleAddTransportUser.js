"use strict";
/**
 * AddTransportUser Handler - add a user (own task) to a transport request.
 *
 * Mirrors abap-adt-api's transportAddUser:
 *   POST /sap/bc/adt/cts/transportrequests/{tr}/tasks
 *   body: <tm:root ... tm:targetuser tm:useraction="newtask"/>
 *
 * Mutating: creates a new task owned by the given user under the request.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleAddTransportUser = handleAddTransportUser;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'AddTransportUser',
    available_in: ['onprem', 'cloud'],
    description: 'Add a user to a transport request (creates a new task owned by that user under the request).',
    inputSchema: {
        type: 'object',
        properties: {
            transport_number: {
                type: 'string',
                description: 'Transport request number, e.g. ABCK900001.',
            },
            user: {
                type: 'string',
                description: 'SAP user name to add as a task owner.',
            },
        },
        required: ['transport_number', 'user'],
    },
};
async function handleAddTransportUser(context, args) {
    const { connection, logger } = context;
    try {
        const { transport_number, user } = args ?? {};
        if (!transport_number || !user) {
            return (0, utils_1.return_error)(new Error('transport_number and user are required'));
        }
        const tr = transport_number.toUpperCase();
        const targetuser = user.toUpperCase();
        const body = `<?xml version="1.0" encoding="ASCII"?>
  <tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:number="${tr}"
  tm:targetuser="${targetuser}" tm:useraction="newtask"/>`;
        logger?.info(`AddTransportUser: ${tr} += ${targetuser}`);
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/cts/transportrequests/${tr}/tasks`, 'POST', 'default', body, undefined, { Accept: 'application/*', 'Content-Type': 'text/plain' });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                transport_number: tr,
                user: targetuser,
                message: `User ${targetuser} added to transport ${tr}`,
            }),
        });
    }
    catch (error) {
        logger?.error(`AddTransportUser failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleAddTransportUser.js.map