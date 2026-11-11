"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckTable = handleCheckTable;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckTable_1 = require("../low/handleCheckTable");
exports.TOOL_DEFINITION = {
    name: 'CheckTable',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP table. Checks the stored version, or DDL you supply for an existing table. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., ZMCP_MY_TABLE).',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active', 'inactive', or 'new'. Default: active — a table with no inactive version cannot be checked as 'inactive'/'new' (SAP answers \"Error while importing object ... from the database\").",
                enum: ['active', 'inactive', 'new'],
            },
            ddl_code: {
                type: 'string',
                description: 'Optional: DDL source code to validate instead of the saved version.',
            },
        },
        required: ['table_name'],
    },
};
async function handleCheckTable(context, args) {
    const result = await (0, handleCheckTable_1.handleCheckTable)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.table_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckTable.js.map