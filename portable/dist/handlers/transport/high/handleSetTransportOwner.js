"use strict";
/**
 * SetTransportOwner Handler - change the owner of a transport request.
 *
 * Mirrors abap-adt-api's transportSetOwner:
 *   PUT /sap/bc/adt/cts/transportrequests/{tr}?targetuser={user}
 *   body: <tm:root ... tm:number tm:targetuser tm:useraction="changeowner"/>
 *
 * Mutating.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleSetTransportOwner = handleSetTransportOwner;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'SetTransportOwner',
    available_in: ['onprem', 'cloud'],
    description: 'Change the owner of a transport request to another user.',
    inputSchema: {
        type: 'object',
        properties: {
            transport_number: {
                type: 'string',
                description: 'Transport request number, e.g. ABCK900001.',
            },
            owner: {
                type: 'string',
                description: 'New owner (SAP user name).',
            },
        },
        required: ['transport_number', 'owner'],
    },
};
async function handleSetTransportOwner(context, args) {
    const { connection, logger } = context;
    try {
        const { transport_number, owner } = args ?? {};
        if (!transport_number || !owner) {
            return (0, utils_1.return_error)(new Error('transport_number and owner are required'));
        }
        const tr = transport_number.toUpperCase();
        const targetuser = owner.toUpperCase();
        const body = `<?xml version="1.0" encoding="ASCII"?><tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" tm:number="${tr}" tm:targetuser="${targetuser}" tm:useraction="changeowner"/>`;
        logger?.info(`SetTransportOwner: ${tr} -> ${targetuser}`);
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/cts/transportrequests/${tr}`, 'PUT', 'default', body, { targetuser }, { Accept: 'application/*', 'Content-Type': 'text/plain' });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                transport_number: tr,
                owner: targetuser,
                message: `Transport ${tr} owner changed to ${targetuser}`,
            }),
        });
    }
    catch (error) {
        logger?.error(`SetTransportOwner failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleSetTransportOwner.js.map