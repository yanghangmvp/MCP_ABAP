"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerQuery = handleHandlerQuery;
const utils_1 = require("../../../lib/utils");
const handleGetSqlQuery_1 = require("../../system/readonly/handleGetSqlQuery");
const handleGetTableContents_1 = require("../../table/readonly/handleGetTableContents");
const compactSchemas_1 = require("./compactSchemas");
exports.TOOL_DEFINITION = {
    name: 'HandlerQuery',
    available_in: ['onprem', 'cloud'],
    description: "Read data. operation='sql' (needs sql_query) or 'table' (needs table_name). Optional: max_rows. Response: JSON rows.",
    inputSchema: compactSchemas_1.compactQuerySchema,
};
async function handleHandlerQuery(context, args) {
    switch (args?.operation) {
        case 'sql':
            if (!args.sql_query) {
                return (0, utils_1.return_error)(new Error("operation='sql' requires sql_query."));
            }
            return (0, handleGetSqlQuery_1.handleGetSqlQuery)(context, {
                sql_query: args.sql_query,
                row_number: args.max_rows,
            });
        case 'table':
            if (!args.table_name) {
                return (0, utils_1.return_error)(new Error("operation='table' requires table_name."));
            }
            return (0, handleGetTableContents_1.handleGetTableContents)(context, {
                table_name: args.table_name,
                max_rows: args.max_rows,
            });
        default:
            return (0, utils_1.return_error)(new Error(`Unknown operation "${args?.operation}". Use 'sql' or 'table'.`));
    }
}
//# sourceMappingURL=handleHandlerQuery.js.map