"use strict";
/**
 * PrettyPrintSource Handler - format ABAP source with the system pretty printer.
 *
 * Mirrors abap-adt-api's prettyPrinter:
 *   POST /sap/bc/adt/abapsource/prettyprinter
 *   Content-Type: text/plain, Accept: text/plain
 *   body: the source to format -> formatted source (plain text)
 *
 * Formatting follows the system-wide pretty-printer settings (indentation +
 * keyword case). Read GetPrettyPrinterSettings to see them, SetPrettyPrinterSettings
 * to change them. Read-only: this only reformats the text you pass in; it does
 * not read or write any repository object.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handlePrettyPrintSource = handlePrettyPrintSource;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'PrettyPrintSource',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Format ABAP source code using the system pretty printer (indentation + keyword case per the system settings). Pass the raw source; returns the formatted source. Useful to normalize generated code before Update*/activation. Does not modify any repository object.',
    inputSchema: {
        type: 'object',
        properties: {
            source: {
                type: 'string',
                description: 'ABAP source code to format.',
            },
        },
        required: ['source'],
    },
};
async function handlePrettyPrintSource(context, args) {
    const { connection, logger } = context;
    try {
        const source = args?.source;
        if (source === undefined || source === null) {
            return (0, utils_1.return_error)(new Error('source is required'));
        }
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/abapsource/prettyprinter', 'POST', 'default', source, undefined, { 'Content-Type': 'text/plain', Accept: 'text/plain' });
        // The endpoint returns the formatted source as plain text; fall back to the
        // original source if the server returned an empty body.
        const formatted = resp.data !== undefined && resp.data !== null && String(resp.data) !== ''
            ? String(resp.data)
            : source;
        logger?.info(`PrettyPrintSource: formatted ${source.length} chars`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                formatted_source: formatted,
                changed: formatted !== source,
            }),
        });
    }
    catch (error) {
        logger?.error(`PrettyPrintSource failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handlePrettyPrintSource.js.map