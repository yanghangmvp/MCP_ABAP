"use strict";
/**
 * GetAbapDocumentation Handler - fetch ABAP language/keyword documentation for a
 * position in source.
 *
 * Mirrors abap-adt-api's abapDocumentation:
 *   POST /sap/bc/adt/docu/abap/langu?uri={objectUri}#start={line},{column}
 *        &language={EN}&format=eclipse
 *   Content-Type: text/plain (the current source), Accept: html
 *   -> HTML documentation for the keyword/element at that position.
 *
 * Read-only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetAbapDocumentation = handleGetAbapDocumentation;
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetAbapDocumentation',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Fetch ABAP keyword/element documentation for a position in source. Provide the object SOURCE uri (e.g. /sap/bc/adt/oo/classes/zcl_x/source/main), the current full source, and the line/column of the token. Returns the documentation as HTML. Does not modify anything.',
    inputSchema: {
        type: 'object',
        properties: {
            object_uri: {
                type: 'string',
                description: 'ADT source URI of the object, e.g. /sap/bc/adt/oo/classes/zcl_foo/source/main.',
            },
            source: {
                type: 'string',
                description: 'Current full source of the object.',
            },
            line: {
                type: 'number',
                description: 'Line of the token to document (1-based).',
            },
            column: {
                type: 'number',
                description: 'Column of the token (0-based).',
            },
            language: {
                type: 'string',
                description: 'Documentation language (default: EN).',
            },
        },
        required: ['object_uri', 'source', 'line', 'column'],
    },
};
async function handleGetAbapDocumentation(context, args) {
    const { connection, logger } = context;
    try {
        const { object_uri, source, line, column, language = 'EN', } = args ?? {};
        if (!object_uri ||
            source === undefined ||
            line === undefined ||
            column === undefined) {
            return (0, utils_1.return_error)(new Error('object_uri, source, line and column are required'));
        }
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/docu/abap/langu', 'POST', 'default', source, {
            uri: `${object_uri}#start=${line},${column}`,
            language,
            format: 'eclipse',
        }, {
            'Content-Type': 'text/plain',
            Accept: 'application/vnd.sap.adt.docu.v1+html,text/html',
        });
        const html = resp.data !== undefined ? String(resp.data) : '';
        logger?.info(`GetAbapDocumentation: ${html.length} chars at ${object_uri}#${line},${column}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                object_uri,
                line,
                column,
                language,
                documentation_html: html,
                message: html
                    ? undefined
                    : 'No documentation returned for this position',
            }),
        });
    }
    catch (error) {
        logger?.error(`GetAbapDocumentation failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetAbapDocumentation.js.map