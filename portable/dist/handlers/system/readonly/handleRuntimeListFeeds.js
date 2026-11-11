"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleRuntimeListFeeds = handleRuntimeListFeeds;
const adt_clients_1 = require("@mcp-abap-adt/adt-clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'RuntimeListFeeds',
    available_in: ['onprem', 'cloud'],
    description: '[runtime] List available ADT runtime feeds or read a specific feed type. Feed types: dumps, system_messages, gateway_errors. Without feed_type returns available feed descriptors.',
    inputSchema: {
        type: 'object',
        properties: {
            feed_type: {
                type: 'string',
                enum: [
                    'descriptors',
                    'variants',
                    'dumps',
                    'system_messages',
                    'gateway_errors',
                ],
                description: 'Feed to read. "descriptors" lists available feeds, "variants" lists feed variants, others read that specific feed. Default: descriptors.',
                default: 'descriptors',
            },
            user: {
                type: 'string',
                description: 'Filter feed entries by SAP username.',
            },
            max_results: {
                type: 'number',
                description: 'Maximum number of entries to return.',
            },
            from: {
                type: 'string',
                description: 'Start of time range in YYYYMMDDHHMMSS format.',
            },
            to: {
                type: 'string',
                description: 'End of time range in YYYYMMDDHHMMSS format.',
            },
        },
        required: [],
    },
};
async function handleRuntimeListFeeds(context, args) {
    const { connection, logger } = context;
    try {
        const runtimeClient = new adt_clients_1.AdtRuntimeClient(connection, logger);
        const feeds = runtimeClient.getFeeds();
        const feedType = args?.feed_type ?? 'descriptors';
        const queryOptions = {
            user: args?.user,
            maxResults: args?.max_results,
            from: args?.from,
            to: args?.to,
        };
        let data;
        switch (feedType) {
            case 'descriptors':
                data = await feeds.list();
                break;
            case 'variants':
                data = await feeds.variants();
                break;
            case 'dumps':
                data = await feeds.dumps(queryOptions);
                break;
            case 'system_messages':
                data = await feeds.systemMessages(queryOptions);
                break;
            case 'gateway_errors':
                data = await feeds.gatewayErrors(queryOptions);
                break;
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                feed_type: feedType,
                count: Array.isArray(data) ? data.length : undefined,
                entries: data,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error('Error reading feeds:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleRuntimeListFeeds.js.map