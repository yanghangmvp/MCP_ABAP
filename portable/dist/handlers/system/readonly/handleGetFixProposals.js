"use strict";
/**
 * GetFixProposals Handler - list ABAP quick-fix proposals at a source position.
 *
 * These are the fixes behind an ATC finding's quickfix_info (and any editor
 * quick-fix). Mirrors abap-adt-api's fixProposals:
 *   POST /sap/bc/adt/quickfixes/evaluation?uri={objectUri}#start={line},{column}
 *   body: the current object source
 *   -> qf:evaluationResults / evaluationResult[] (each an objectReference to a
 *      quickfixes URI + opaque userContent)
 *
 * Read-only: evaluation computes proposals but never modifies the object. Feed a
 * returned proposal to GetFixEdits to compute the concrete source edit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetFixProposals = handleGetFixProposals;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetFixProposals',
    available_in: ['onprem', 'cloud'],
    description: "[read-only] List available ABAP quick-fix proposals at a source position — the fixes behind an ATC finding's quickfix_info, or any editor quick-fix. Provide the object SOURCE uri (e.g. /sap/bc/adt/oo/classes/zcl_x/source/main), the current full source, and the line/column of the position. Returns proposals; pass one (proposal_adt_uri + user_content) to GetFixEdits to compute the concrete edit. Does not modify the object.",
    inputSchema: {
        type: 'object',
        properties: {
            object_uri: {
                type: 'string',
                description: 'ADT source URI of the object, e.g. /sap/bc/adt/oo/classes/zcl_foo/source/main or /sap/bc/adt/programs/programs/zfoo/source/main.',
            },
            source: {
                type: 'string',
                description: 'Current full source of the object (as returned by the matching Get*/Read* tool).',
            },
            line: {
                type: 'number',
                description: 'Line of the position to evaluate (1-based).',
            },
            column: {
                type: 'number',
                description: 'Column of the position (0-based).',
            },
        },
        required: ['object_uri', 'source', 'line', 'column'],
    },
};
async function handleGetFixProposals(context, args) {
    const { connection, logger } = context;
    try {
        const { object_uri, source, line, column } = args ?? {};
        if (!object_uri ||
            source === undefined ||
            line === undefined ||
            column === undefined) {
            return (0, utils_1.return_error)(new Error('object_uri, source, line and column are required'));
        }
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/quickfixes/evaluation', 'POST', 'default', source, { uri: `${object_uri}#start=${line},${column}` }, { 'Content-Type': 'application/*', Accept: 'application/*' });
        const parsed = (0, atcParser_1.parseAtcXml)(String(resp.data));
        const results = (0, atcParser_1.asArray)(parsed?.evaluationResults?.evaluationResult);
        const proposals = results.map((r) => {
            const ref = r.objectReference ?? {};
            return {
                proposal_adt_uri: ref['@_uri'] ?? null,
                name: ref['@_name'] ?? null,
                description: ref['@_description'] ?? null,
                user_content: typeof r.userContent === 'string'
                    ? r.userContent
                    : (r.userContent ?? ''),
            };
        });
        logger?.info(`GetFixProposals: ${proposals.length} proposal(s) at ${object_uri}#${line},${column}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                object_uri,
                line,
                column,
                proposal_count: proposals.length,
                proposals,
                message: proposals.length === 0
                    ? 'No quick-fix proposals at this position'
                    : `${proposals.length} quick-fix proposal(s); pass one to GetFixEdits`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`GetFixProposals failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetFixProposals.js.map