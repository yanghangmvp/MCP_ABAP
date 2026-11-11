"use strict";
/**
 * GetFixEdits Handler - compute the concrete source edits for a quick-fix
 * proposal returned by GetFixProposals, WITHOUT applying them.
 *
 * Mirrors abap-adt-api's fixEdits:
 *   POST {proposal_adt_uri}   (a /sap/bc/adt/quickfixes/... URI)
 *   body: <quickfixes:proposalRequest> with the current source + objectReference
 *   -> qf:proposalResult / deltas / unit[] (each: target object + new content)
 *
 * Read-only: it returns the text deltas (target object, range, new content) so
 * they can be reviewed and then written back with the matching Update tool. It
 * does not modify anything on the server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetFixEdits = handleGetFixEdits;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetFixEdits',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Compute the concrete source edits for a quick-fix proposal from GetFixProposals, without applying them. Pass the proposal_adt_uri and user_content from GetFixProposals plus the object_uri, line, column and current source. Returns the text deltas (target object uri, range, new content) — review them and write back with the matching Update tool. Does not modify the object.',
    inputSchema: {
        type: 'object',
        properties: {
            proposal_adt_uri: {
                type: 'string',
                description: 'The proposal_adt_uri from GetFixProposals (a /sap/bc/adt/quickfixes/... URI).',
            },
            object_uri: {
                type: 'string',
                description: 'ADT source URI of the object being fixed (same as passed to GetFixProposals).',
            },
            line: { type: 'number', description: 'Line of the position (1-based).' },
            column: {
                type: 'number',
                description: 'Column of the position (0-based).',
            },
            source: {
                type: 'string',
                description: 'Current full source of the object.',
            },
            user_content: {
                type: 'string',
                description: '(optional) The opaque user_content from the chosen GetFixProposals proposal.',
            },
        },
        required: ['proposal_adt_uri', 'object_uri', 'line', 'column', 'source'],
    },
};
/** Escape text for XML element content. */
function escapeXmlText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
async function handleGetFixEdits(context, args) {
    const { connection, logger } = context;
    try {
        const { proposal_adt_uri, object_uri, line, column, source, user_content = '', } = args ?? {};
        if (!proposal_adt_uri ||
            !object_uri ||
            line === undefined ||
            column === undefined ||
            source === undefined) {
            return (0, utils_1.return_error)(new Error('proposal_adt_uri, object_uri, line, column and source are required'));
        }
        if (!/\/sap\/bc\/adt\/quickfixes/.test(proposal_adt_uri)) {
            return (0, utils_1.return_error)(new Error('proposal_adt_uri must be a /sap/bc/adt/quickfixes/... URI from GetFixProposals'));
        }
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<quickfixes:proposalRequest xmlns:quickfixes="http://www.sap.com/adt/quickfixes" xmlns:adtcore="http://www.sap.com/adt/core">\n` +
            `  <input>\n` +
            `    <content>${escapeXmlText(source)}</content>\n` +
            `    <adtcore:objectReference adtcore:uri="${object_uri}#start=${line},${column}"/>\n` +
            `  </input>\n` +
            `  <userContent>${escapeXmlText(user_content)}</userContent>\n` +
            `</quickfixes:proposalRequest>`;
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, proposal_adt_uri, 'POST', 'default', body, undefined, { 'Content-Type': 'application/*', Accept: 'application/*' });
        const parsed = (0, atcParser_1.parseAtcXml)(String(resp.data));
        const units = (0, atcParser_1.asArray)(parsed?.proposalResult?.deltas?.unit);
        const deltas = units.map((u) => {
            const ref = u.objectReference ?? {};
            return {
                uri: ref['@_uri'] ?? null,
                name: ref['@_name'] ?? null,
                type: ref['@_type'] ?? null,
                content: typeof u.content === 'string' ? u.content : (u.content ?? ''),
            };
        });
        logger?.info(`GetFixEdits: ${deltas.length} delta(s) for ${proposal_adt_uri}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                proposal_adt_uri,
                object_uri,
                delta_count: deltas.length,
                deltas,
                message: deltas.length === 0
                    ? 'Quick-fix produced no edits'
                    : `${deltas.length} edit delta(s); apply with the matching Update tool`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`GetFixEdits failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetFixEdits.js.map