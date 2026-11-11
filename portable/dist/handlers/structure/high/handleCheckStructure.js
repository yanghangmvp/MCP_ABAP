"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckStructure = handleCheckStructure;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckStructure_1 = require("../low/handleCheckStructure");
exports.TOOL_DEFINITION = {
    name: 'CheckStructure',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP structure. Checks the stored version, or DDL you supply for an existing structure. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            structure_name: {
                type: 'string',
                description: 'Structure name (e.g., ZST_MY_STRUCTURE).',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' or 'inactive'." +
                    " Default: active — a DDIC object with no inactive version cannot be checked as 'inactive'/'new' (SAP answers \"Error while importing object ... from the database\").",
                enum: ['active', 'inactive'],
            },
            ddl_code: {
                type: 'string',
                description: 'Optional: DDL source code to validate instead of the saved version.',
            },
        },
        required: ['structure_name'],
    },
};
async function handleCheckStructure(context, args) {
    const result = await (0, handleCheckStructure_1.handleCheckStructure)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.structure_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckStructure.js.map