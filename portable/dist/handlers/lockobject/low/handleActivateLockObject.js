"use strict";
/**
 * ActivateLockObject Handler - Activate an ABAP lock object (ENQU).
 * Activation generates the ENQUEUE_/DEQUEUE_ function modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleActivateLockObject = handleActivateLockObject;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ActivateLockObject',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Activate an ABAP lock object (ENQU). Use after CreateLockObject or UpdateLockObject; activation generates the ENQUEUE/DEQUEUE function modules.',
    inputSchema: {
        type: 'object',
        properties: {
            lock_object_name: { type: 'string', description: 'Lock object name.' },
        },
        required: ['lock_object_name'],
    },
};
async function handleActivateLockObject(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.lock_object_name)
            return (0, utils_1.return_error)(new Error('lock_object_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.lock_object_name.toUpperCase();
        const url = `/sap/bc/adt/ddic/lockobjects/sources/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        // Success comes from SAP's MESSAGES, not from the run flags: ADT reports
        // activationExecuted="true" even for an object it REFUSED, so the old
        // `activated && checked` test read a rejected activation as success.
        const outcome = (0, adtMessages_1.evaluateActivation)(await (0, adtObjectOps_1.activateAdt)(connection, name, url));
        logger?.info(`Lock object activation {name}: ${outcome.success ? 'ok' : 'FAILED'}`.replace('{name}', name));
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: outcome.success,
                lock_object_name: name,
                activated: outcome.activated,
                checked: outcome.checked,
                messages: outcome.messages,
                message: outcome.success
                    ? (0, adtMessages_1.describeActivation)(outcome, `Lock object ${name}`)
                    : `Activation FAILED for lock object ${name}: ${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleActivateLockObject.js.map