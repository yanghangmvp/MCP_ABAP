"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerDumpList = handleHandlerDumpList;
const handleRuntimeListFeeds_1 = require("../../system/readonly/handleRuntimeListFeeds");
const compactSchemas_1 = require("./compactSchemas");
exports.TOOL_DEFINITION = {
    name: 'HandlerDumpList',
    available_in: ['onprem'],
    description: 'Runtime dump list. object_type: not used. Required: none. Optional: user, top, from, to. Response: JSON.',
    inputSchema: compactSchemas_1.compactDumpListSchema,
};
async function handleHandlerDumpList(context, args) {
    return (0, handleRuntimeListFeeds_1.handleRuntimeListFeeds)(context, {
        feed_type: 'dumps',
        user: args?.user,
        max_results: args?.top,
        from: args?.from,
        to: args?.to,
    });
}
//# sourceMappingURL=handleHandlerDumpList.js.map