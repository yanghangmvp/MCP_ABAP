"use strict";
/**
 * UpdateAccessControl Handler - Replace a DCL source, optionally activate.
 * Workflow: lock -> PUT source/main -> unlock -> (activate).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateAccessControl = handleUpdateAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateAccessControl',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update. Subject: Access Control (DCL / DCLS). Replace the complete source of an ' +
        'existing DCL and optionally activate it. Locks, writes, unlocks, activates. ' +
        'The source must be the WHOLE role definition — this is a replace, not a patch.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name (must already exist).',
            },
            source_code: {
                type: 'string',
                description: 'Complete DCL source, e.g. "@EndUserText.label: \'…\'  @MappingRole: true  define role Z_X { grant select on Z_X where …; }".',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request (if the object is transportable).',
            },
            activate: {
                type: 'boolean',
                description: 'Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects are activated together afterwards via ActivateObjects). The activated field in the response is SAP’s own verdict, not a copy of this parameter.',
            },
        },
        required: ['access_control_name', 'source_code'],
    },
};
async function handleUpdateAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name || !args?.source_code) {
            return (0, utils_1.return_error)(new Error('access_control_name and source_code are required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        const base = (0, accessControlXml_1.accessControlUri)(name);
        const shouldActivate = args.activate !== false;
        await (0, adtObjectOps_1.runLocked)(connection, base, async (lockHandle) => {
            await (0, adtObjectOps_1.putAdtSource)(connection, `${base}/source/main`, args.source_code, lockHandle, args.transport_request);
            logger?.info(`Access control source updated: ${name}`);
        });
        // Judge the activation by SAP's MESSAGES, not by the `activated` flag: that
        // flag only reports the activation RUN executed, and a rejected object still
        // comes back with activationExecuted="true" plus an error message.
        let activation;
        if (shouldActivate) {
            activation = await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
                { name, type: accessControlXml_1.ACCESS_CONTROL_TYPE },
            ]);
            if (!activation.success) {
                throw new Error(`Access control ${name} source was updated but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive.`);
            }
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: activation ? activation.success : true,
                access_control_name: name,
                activated: activation ? activation.activated : false,
                activation: activation
                    ? {
                        activated: activation.activated,
                        checked: activation.checked,
                        messages: activation.messages,
                    }
                    : undefined,
                message: `Access control ${name} updated${shouldActivate ? ' and activated' : ' (left inactive)'}.`,
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
        const msg = `Error updating access control ${args?.access_control_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleUpdateAccessControl.js.map