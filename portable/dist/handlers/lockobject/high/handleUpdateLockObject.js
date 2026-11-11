"use strict";
/**
 * UpdateLockObject Handler - Change an ABAP lock object's primary table / mode / RFC flag.
 * Workflow: GET current (preserve root attrs + package) -> lock -> PUT -> unlock -> (activate).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateLockObject = handleUpdateLockObject;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const lockObjectXml_1 = require("../../../lib/lockObjectXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateLockObject',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Update. Subject: LockObject (ENQU). Update an existing lock object (primary table, lock mode, RFC flag). Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            lock_object_name: {
                type: 'string',
                description: 'Lock object name (must exist).',
            },
            primary_table: { type: 'string', description: 'Primary (base) table.' },
            lock_mode: {
                type: 'string',
                description: 'Lock mode: E (default), S, X, O.',
                enum: ['E', 'S', 'X', 'O'],
            },
            allow_rfc: {
                type: 'boolean',
                description: 'Allow enqueue via RFC. Default: false.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request (if transportable).',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['lock_object_name', 'primary_table'],
    },
};
async function handleUpdateLockObject(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.lock_object_name)
            return (0, utils_1.return_error)(new Error('lock_object_name is required'));
        if (!args?.primary_table)
            return (0, utils_1.return_error)(new Error('primary_table is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.lock_object_name.toUpperCase();
        const url = `/sap/bc/adt/ddic/lockobjects/sources/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        const shouldActivate = args.activate !== false;
        const current = await (0, adtObjectOps_1.getAdt)(connection, url);
        const openTag = current.match(/<enqu:lockobject[^>]*>/)?.[0];
        const pkgRef = current.match(/<adtcore:packageRef[^>]*\/>/)?.[0] || '';
        if (!openTag)
            return (0, utils_1.return_error)(new Error(`Could not parse existing lock object ${name}`));
        const content = (0, lockObjectXml_1.buildLockContent)({
            allowRfc: args.allow_rfc === true,
            primaryTable: args.primary_table.toUpperCase(),
            lockMode: (args.lock_mode || 'E').toUpperCase(),
        });
        const body = `<?xml version="1.0" encoding="UTF-8"?>${openTag}${pkgRef}${content}</enqu:lockobject>`;
        await (0, adtObjectOps_1.runLocked)(connection, url, async (lockHandle) => {
            await (0, adtObjectOps_1.putAdtContent)(connection, url, body, lockHandle, args.transport_request);
            logger?.info(`Lock object updated: ${name}`);
        });
        // Judge the activation by SAP's MESSAGES, not by the `activated` flag: that
        // flag reports the activation RUN executed, and a rejected object still
        // comes back with activated:true plus an error message.
        let activation;
        if (shouldActivate) {
            activation = (0, adtMessages_1.evaluateActivation)(await (0, adtObjectOps_1.activateAdt)(connection, name, url));
            if (!activation.success) {
                throw new Error(`Lock object ${name} was updated but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive.`);
            }
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: activation ? activation.success : true,
                lock_object_name: name,
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                activation: activation
                    ? {
                        activated: activation.activated,
                        checked: activation.checked,
                        messages: activation.messages,
                    }
                    : undefined,
                message: `Lock object ${name} updated${shouldActivate ? ' and activated' : ''}`,
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
        const msg = `Error updating lock object ${args?.lock_object_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleUpdateLockObject.js.map