"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerSearch = handleHandlerSearch;
const utils_1 = require("../../../lib/utils");
const handleSearchObject_1 = require("../../search/readonly/handleSearchObject");
const handleGetWhereUsed_1 = require("../../system/readonly/handleGetWhereUsed");
const handleSearchSource_1 = require("../../system/readonly/handleSearchSource");
const compactSchemas_1 = require("./compactSchemas");
exports.TOOL_DEFINITION = {
    name: 'HandlerSearch',
    available_in: ['onprem', 'cloud'],
    description: "Find things. operation='object' (needs object_name) | 'source' (needs query + packages, onprem only) | 'where_used' (needs object_name + object_type). Response: JSON.",
    inputSchema: compactSchemas_1.compactSearchSchema,
};
async function handleHandlerSearch(context, args) {
    switch (args?.operation) {
        case 'object':
            if (!args.object_name) {
                return (0, utils_1.return_error)(new Error("operation='object' requires object_name."));
            }
            return (0, handleSearchObject_1.handleSearchObject)(context, {
                object_name: args.object_name,
                object_type: args.object_type,
                max_results: args.max_results,
            });
        case 'source':
            if (!args.query || !args.packages?.length) {
                return (0, utils_1.return_error)(new Error('operation=\'source\' requires query and packages (PACKAGE names, e.g. ["$TMP"]).'));
            }
            return (0, handleSearchSource_1.handleSearchSource)(context, {
                query: args.query,
                packages: args.packages,
            });
        case 'where_used':
            if (!args.object_name || !args.object_type) {
                return (0, utils_1.return_error)(new Error("operation='where_used' requires object_name and object_type."));
            }
            return (0, handleGetWhereUsed_1.handleGetWhereUsed)(context, {
                object_name: args.object_name,
                object_type: args.object_type,
            });
        default:
            return (0, utils_1.return_error)(new Error(`Unknown operation "${args?.operation}". Use 'object', 'source' or 'where_used'.`));
    }
}
//# sourceMappingURL=handleHandlerSearch.js.map