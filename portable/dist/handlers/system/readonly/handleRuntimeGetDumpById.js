"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleRuntimeGetDumpById = handleRuntimeGetDumpById;
const adt_clients_1 = require("@mcp-abap-adt/adt-clients");
const utils_1 = require("../../../lib/utils");
const runtimePayloadParser_1 = require("./runtimePayloadParser");
exports.TOOL_DEFINITION = {
    name: 'RuntimeGetDumpById',
    available_in: ['onprem', 'cloud'],
    description: '[runtime] Read a specific ABAP runtime dump by its ID. First use RuntimeListFeeds to find dumps and get their IDs, then pass dump_id here to read the full dump content.',
    inputSchema: {
        type: 'object',
        properties: {
            dump_id: {
                type: 'string',
                description: 'Full runtime dump ID (e.g. from RuntimeListFeeds).',
            },
            view: {
                type: 'string',
                enum: ['default', 'summary', 'formatted'],
                description: 'Dump view mode: default payload, summary section, or formatted long text.',
                default: 'default',
            },
            response_mode: {
                type: 'string',
                enum: ['payload', 'summary', 'both'],
                description: 'Controls what is returned: "payload" — full parsed dump data, "summary" — compact key facts only (title, exception, program, line, user, date…), "both" — summary + full payload.',
                default: 'both',
            },
        },
        required: ['dump_id'],
    },
};
function collectKeyFacts(value, target, depth = 0) {
    if (!value || depth > 8 || Object.keys(target).length >= 20) {
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectKeyFacts(item, target, depth + 1);
        }
        return;
    }
    if (typeof value !== 'object') {
        return;
    }
    const interestingKeys = [
        'title',
        'shorttext',
        'shortText',
        'category',
        'exception',
        'program',
        'include',
        'line',
        'user',
        'date',
        'time',
        'host',
        'application',
        'component',
        'client',
    ];
    const obj = value;
    for (const [key, nested] of Object.entries(obj)) {
        const keyNormalized = key.toLowerCase();
        const isInteresting = interestingKeys.some((candidate) => keyNormalized === candidate.toLowerCase());
        if (isInteresting &&
            target[key] === undefined &&
            (typeof nested === 'string' ||
                typeof nested === 'number' ||
                typeof nested === 'boolean')) {
            target[key] = nested;
        }
        collectKeyFacts(nested, target, depth + 1);
    }
}
async function handleRuntimeGetDumpById(context, args) {
    const { connection, logger } = context;
    try {
        const dumpId = args?.dump_id?.trim();
        if (!dumpId) {
            throw new Error('dump_id is required. Use RuntimeListFeeds to find dump IDs first.');
        }
        const view = args.view ?? 'default';
        const responseMode = args.response_mode ?? 'both';
        const runtimeClient = new adt_clients_1.AdtRuntimeClient(connection, logger);
        const response = await runtimeClient.getDumps().getById(dumpId, { view });
        const parsedPayload = (0, runtimePayloadParser_1.parseRuntimePayloadToJson)(response.data);
        const result = {
            success: true,
            dump_id: dumpId,
            view,
            status: response.status,
        };
        if (responseMode === 'summary' || responseMode === 'both') {
            const summary = {};
            collectKeyFacts(parsedPayload, summary);
            result.summary = summary;
        }
        if (responseMode === 'payload' || responseMode === 'both') {
            result.payload = parsedPayload;
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify(result, null, 2),
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
        });
    }
    catch (error) {
        logger?.error('Error reading runtime dump by ID:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleRuntimeGetDumpById.js.map