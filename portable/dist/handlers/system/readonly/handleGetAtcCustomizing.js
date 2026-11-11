"use strict";
/**
 * GetAtcCustomizing Handler - Read ATC customizing (default check variant,
 * properties, exemption reasons). Mirrors abap-adt-api's atcCustomizing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetAtcCustomizing = handleGetAtcCustomizing;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetAtcCustomizing',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Get ATC customizing: the system default check variant, ATC properties, and available exemption reasons.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};
async function handleGetAtcCustomizing(context, _args) {
    const { connection, logger } = context;
    try {
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/atc/customizing', 'GET', 'default', undefined, undefined, { Accept: 'application/vnd.sap.atc.customizing-v1+xml, application/xml' });
        const customizing = (0, atcParser_1.parseAtcCustomizing)(String(resp.data));
        logger?.info(`GetAtcCustomizing: system variant = ${customizing.system_check_variant ?? '(none)'}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                system_check_variant: customizing.system_check_variant,
                properties: customizing.properties,
                exemption_reasons: customizing.exemption_reasons,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`GetAtcCustomizing failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetAtcCustomizing.js.map