"use strict";
/**
 * SetPrettyPrinterSettings Handler - change the system pretty-printer settings.
 *
 * Mirrors abap-adt-api's setPrettyPrinterSetting:
 *   PUT /sap/bc/adt/abapsource/prettyprinter/settings
 *   body: <prettyprintersettings:PrettyPrinterSettings ... indentation style/>
 *
 * Mutating: this changes a system-wide formatting setting that affects every
 * subsequent PrettyPrintSource call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleSetPrettyPrinterSettings = handleSetPrettyPrinterSettings;
const utils_1 = require("../../../lib/utils");
const STYLES = [
    'toLower',
    'toUpper',
    'keywordUpper',
    'keywordLower',
    'keywordAuto',
    'none',
];
exports.TOOL_DEFINITION = {
    name: 'SetPrettyPrinterSettings',
    available_in: ['onprem', 'cloud'],
    description: 'Change the system ABAP pretty-printer settings (indentation on/off and keyword style). Note: this is a system-wide setting affecting every subsequent PrettyPrintSource call.',
    inputSchema: {
        type: 'object',
        properties: {
            indentation: {
                type: 'boolean',
                description: 'Enable indentation.',
            },
            style: {
                type: 'string',
                enum: [...STYLES],
                description: 'Keyword style: toLower, toUpper, keywordUpper, keywordLower, keywordAuto, none.',
            },
        },
        required: ['indentation', 'style'],
    },
};
async function handleSetPrettyPrinterSettings(context, args) {
    const { connection, logger } = context;
    try {
        const { indentation, style } = args ?? {};
        if (indentation === undefined || !style) {
            return (0, utils_1.return_error)(new Error('indentation and style are required'));
        }
        if (!STYLES.includes(style)) {
            return (0, utils_1.return_error)(new Error(`style must be one of: ${STYLES.join(', ')}`));
        }
        const body = `<?xml version="1.0" encoding="UTF-8"?><prettyprintersettings:PrettyPrinterSettings
xmlns:prettyprintersettings="http://www.sap.com/adt/prettyprintersettings"
prettyprintersettings:indentation="${indentation}" prettyprintersettings:style="${style}"/>`;
        logger?.info(`SetPrettyPrinterSettings: indentation=${indentation} style=${style}`);
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/abapsource/prettyprinter/settings', 'PUT', 'default', body, undefined, { 'Content-Type': 'application/*' });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                indentation,
                style,
                message: `Pretty-printer settings updated (indentation=${indentation}, style=${style})`,
            }),
        });
    }
    catch (error) {
        logger?.error(`SetPrettyPrinterSettings failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleSetPrettyPrinterSettings.js.map