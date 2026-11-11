"use strict";
/**
 * ReleaseTransport Handler - release a transport request (and its tasks).
 *
 * Mirrors abap-adt-api's transportRelease:
 *   POST /sap/bc/adt/cts/transportrequests/{tr}/{action}
 *     action = newreleasejobs (default)
 *            | relwithignlock  (ignore_locks)
 *            | relObjigchkatc  (ignore_atc)
 *   -> tm:root/tm:releasereports/chkrun:checkReport[] with status + messages
 *
 * Mutating: releasing is irreversible; the request can no longer be changed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleReleaseTransport = handleReleaseTransport;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ReleaseTransport',
    available_in: ['onprem', 'cloud'],
    description: 'Release a transport request (irreversible — the request can no longer be changed afterwards). Optionally ignore locks or ATC objections. Returns the release report(s) with status and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            transport_number: {
                type: 'string',
                description: 'Transport request number, e.g. ABCK900001.',
            },
            ignore_locks: {
                type: 'boolean',
                description: 'Release even if objects are locked. Default: false.',
            },
            ignore_atc: {
                type: 'boolean',
                description: 'Release ignoring ATC objections. Default: false.',
            },
        },
        required: ['transport_number'],
    },
};
async function handleReleaseTransport(context, args) {
    const { connection, logger } = context;
    try {
        const { transport_number, ignore_locks, ignore_atc } = args ?? {};
        if (!transport_number) {
            return (0, utils_1.return_error)(new Error('transport_number is required'));
        }
        const tr = transport_number.toUpperCase();
        const action = ignore_atc
            ? 'relObjigchkatc'
            : ignore_locks
                ? 'relwithignlock'
                : 'newreleasejobs';
        logger?.info(`ReleaseTransport: ${tr} (action=${action})`);
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/cts/transportrequests/${tr}/${action}`, 'POST', 'long', undefined, undefined, { Accept: 'application/*' });
        const { XMLParser } = require('fast-xml-parser');
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            removeNSPrefix: true,
        });
        const parsed = parser.parse(String(resp.data));
        const reports = (0, atcParser_1.asArray)(parsed?.root?.releasereports?.checkReport).map((r) => ({
            status: r['@_status'] ?? null,
            status_text: r['@_statusText'] ?? null,
            messages: (0, atcParser_1.asArray)(r?.checkMessageList?.checkMessage).map((m) => ({
                type: m['@_type'] ?? null,
                text: m['@_shortText'] ?? null,
                uri: m['@_uri'] ?? null,
            })),
        }));
        const released = reports.some((r) => r.status === 'released');
        const success = reports.length === 0 ? true : released;
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success,
                transport_number: tr,
                action,
                released,
                reports,
                message: `Release ${tr}: ${released ? 'released' : reports.length ? 'not released — see reports' : 'submitted'}`,
            }),
        });
    }
    catch (error) {
        logger?.error(`ReleaseTransport failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleReleaseTransport.js.map