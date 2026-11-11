"use strict";
/**
 * ActivateAccessControl Handler - Activate a DCL source.
 *
 * Success is decided by SAP's MESSAGES, not by the activation-run flags: ADT
 * reports activationExecuted="true" even for an object it REFUSED, so the old
 * `activated && checked` test read a rejected activation as success.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleActivateAccessControl = handleActivateAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ActivateAccessControl',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Activate. Subject: Access Control (DCL / DCLS). Activate a DCL that is still ' +
        'inactive (e.g. after UpdateAccessControl with activate=false). Success is derived from SAP’s ' +
        'own messages, so a refused activation is reported as a failure.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name.',
            },
        },
        required: ['access_control_name'],
    },
};
async function handleActivateAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name) {
            return (0, utils_1.return_error)(new Error('access_control_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        const outcome = await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
            { name, type: accessControlXml_1.ACCESS_CONTROL_TYPE },
        ]);
        logger?.info(`Access control activation ${name}: ${outcome.success ? 'ok' : 'FAILED'}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: outcome.success,
                access_control_name: name,
                activated: outcome.activated,
                checked: outcome.checked,
                messages: outcome.messages,
                uri: (0, accessControlXml_1.accessControlUri)(name),
                message: outcome.success
                    ? (0, adtMessages_1.describeActivation)(outcome, `Access control ${name}`)
                    : `Activation FAILED for access control ${name}: ${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}`,
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
//# sourceMappingURL=handleActivateAccessControl.js.map