"use strict";
/**
 * GetAtcWorklist Handler - Re-read the findings of an existing ATC worklist
 * (created by a previous RunAtc) without re-running the checks.
 * Mirrors abap-adt-api's atcWorklists.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetAtcWorklist = handleGetAtcWorklist;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetAtcWorklist',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Re-read the findings of an existing ATC worklist by worklist_id (returned by RunAtc) without re-running the checks. Useful to re-inspect results or include exempted findings.',
    inputSchema: {
        type: 'object',
        properties: {
            worklist_id: {
                type: 'string',
                description: 'Worklist ID returned by a previous RunAtc call.',
            },
            timestamp: {
                type: 'string',
                description: 'Optional worklist timestamp (from RunAtc worklist_timestamp) to pin the result set.',
            },
            used_object_set: {
                type: 'string',
                description: 'Optional object-set id to filter by (e.g. the PACKAGE set id from the worklist).',
            },
            include_exempted: {
                type: 'boolean',
                description: 'Include exempted findings. Default: false.',
            },
        },
        required: ['worklist_id'],
    },
};
async function handleGetAtcWorklist(context, args) {
    const { connection, logger } = context;
    try {
        const { worklist_id, timestamp, used_object_set, include_exempted = false, } = args ?? {};
        if (!worklist_id) {
            return (0, utils_1.return_error)(new Error('worklist_id is required'));
        }
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/atc/worklists/${encodeURIComponent(worklist_id)}`, 'GET', 'long', undefined, {
            ...(timestamp ? { timestamp } : {}),
            ...(used_object_set ? { usedObjectSet: used_object_set } : {}),
            includeExemptedFindings: include_exempted ? 'true' : 'false',
        }, { Accept: 'application/atc.worklist.v1+xml, application/xml' });
        const worklist = (0, atcParser_1.parseAtcWorklist)(String(resp.data));
        logger?.info(`GetAtcWorklist: ${worklist.findings.length} finding(s) across ${worklist.objects.length} object(s)`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                worklist_id,
                worklist_timestamp: worklist.worklist_timestamp,
                object_set_is_complete: worklist.object_set_is_complete,
                objects_checked: worklist.objects.length,
                objects: worklist.objects,
                finding_count: worklist.findings.length,
                findings_by_priority: (0, atcParser_1.findingsByPriority)(worklist.findings),
                findings: worklist.findings,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`GetAtcWorklist failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetAtcWorklist.js.map