"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleRuntimeGetGatewayErrorLog = handleRuntimeGetGatewayErrorLog;
const adt_clients_1 = require("@mcp-abap-adt/adt-clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'RuntimeGetGatewayErrorLog',
    available_in: ['onprem'],
    description: '[runtime] List SAP Gateway error log (/IWFND/ERROR_LOG) or get error detail. Returns structured entries with type, shortText, transactionId, dateTime, username. With error_url returns full detail including serviceInfo, errorContext, sourceCode, callStack.',
    inputSchema: {
        type: 'object',
        properties: {
            error_url: {
                type: 'string',
                description: 'Feed URL of a specific error entry (from a previous list response link field). When provided, returns detailed error info instead of listing.',
            },
            user: {
                type: 'string',
                description: 'Filter errors by SAP username.',
            },
            max_results: {
                type: 'number',
                description: 'Maximum number of errors to return.',
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
async function handleRuntimeGetGatewayErrorLog(context, args) {
    const { connection, logger } = context;
    try {
        const runtimeClient = new adt_clients_1.AdtRuntimeClient(connection, logger);
        const feeds = runtimeClient.getFeeds();
        if (args?.error_url) {
            const detail = await feeds.gatewayErrorDetail(args.error_url);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    mode: 'detail',
                    error: detail,
                }, null, 2),
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            });
        }
        const errors = await feeds.gatewayErrors({
            user: args?.user,
            maxResults: args?.max_results,
            from: args?.from,
            to: args?.to,
        });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                mode: 'list',
                count: errors.length,
                errors,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error('Error reading gateway error log:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleRuntimeGetGatewayErrorLog.js.map