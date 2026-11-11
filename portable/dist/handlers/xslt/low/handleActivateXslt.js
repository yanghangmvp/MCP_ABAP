"use strict";
/**
 * ActivateXslt Handler - Activate an ABAP transformation (XSLT/ST).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleActivateXslt = handleActivateXslt;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ActivateXslt',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Activate an ABAP transformation (XSLT). Use after CreateXslt or UpdateXslt if it remains inactive.',
    inputSchema: {
        type: 'object',
        properties: {
            xslt_name: { type: 'string', description: 'Transformation name.' },
        },
        required: ['xslt_name'],
    },
};
async function handleActivateXslt(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.xslt_name)
            return (0, utils_1.return_error)(new Error('xslt_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.xslt_name.toUpperCase();
        const base = `/sap/bc/adt/xslt/transformations/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        // Success comes from SAP's MESSAGES, not from the run flags: ADT reports
        // activationExecuted="true" even for an object it REFUSED, so the old
        // `activated && checked` test read a rejected activation as success.
        const outcome = (0, adtMessages_1.evaluateActivation)(await (0, adtObjectOps_1.activateAdt)(connection, name, base));
        logger?.info(`Transformation activation ${name}: ${outcome.success ? 'ok' : 'FAILED'}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: outcome.success,
                xslt_name: name,
                activated: outcome.activated,
                checked: outcome.checked,
                messages: outcome.messages,
                message: outcome.success
                    ? (0, adtMessages_1.describeActivation)(outcome, `Transformation ${name}`)
                    : `Activation FAILED for transformation ${name}: ${(0, adtMessages_1.formatAdtMessages)(outcome.errors)}`,
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
//# sourceMappingURL=handleActivateXslt.js.map