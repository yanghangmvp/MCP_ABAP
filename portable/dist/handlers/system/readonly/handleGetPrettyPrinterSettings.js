"use strict";
/**
 * GetPrettyPrinterSettings Handler - read the system pretty-printer settings.
 *
 * Mirrors abap-adt-api's prettyPrinterSetting:
 *   GET /sap/bc/adt/abapsource/prettyprinter/settings
 *   -> <abapformatter:PrettyPrinterSettings abapformatter:indentation="true"
 *        abapformatter:style="keywordUpper"/>
 *
 * These are the settings PrettyPrintSource applies. Read-only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetPrettyPrinterSettings = handleGetPrettyPrinterSettings;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetPrettyPrinterSettings',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Read the system ABAP pretty-printer settings (indentation on/off and keyword style, e.g. keywordUpper). These are the settings PrettyPrintSource applies.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};
async function handleGetPrettyPrinterSettings(context, _args) {
    const { connection, logger } = context;
    try {
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/abapsource/prettyprinter/settings', 'GET', 'default', undefined, undefined, { Accept: 'application/*' });
        const { XMLParser } = require('fast-xml-parser');
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            removeNSPrefix: true,
        });
        const parsed = parser.parse(String(resp.data));
        const node = parsed?.PrettyPrinterSettings ?? {};
        const indentationRaw = node['@_indentation'];
        const style = node['@_style'] ?? null;
        const indentation = indentationRaw === 'true' || indentationRaw === true
            ? true
            : indentationRaw === 'false' || indentationRaw === false
                ? false
                : null;
        logger?.info(`GetPrettyPrinterSettings: indentation=${indentation} style=${style}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                indentation,
                style,
            }),
        });
    }
    catch (error) {
        logger?.error(`GetPrettyPrinterSettings failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetPrettyPrinterSettings.js.map