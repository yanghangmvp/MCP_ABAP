"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckView = handleCheckView;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckView_1 = require("../low/handleCheckView");
exports.TOOL_DEFINITION = {
    name: 'CheckView',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP CDS view. Checks the stored version, or DDL you supply for an existing view. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            view_name: {
                type: 'string',
                description: 'CDS view name (e.g., ZI_MY_VIEW).',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' or 'inactive'." +
                    " Default: active — a DDIC object with no inactive version cannot be checked as 'inactive'/'new' (SAP answers \"Error while importing object ... from the database\").",
                enum: ['active', 'inactive'],
            },
            ddl_source: {
                type: 'string',
                description: 'Optional: DDL source code to validate instead of the saved version.',
            },
        },
        required: ['view_name'],
    },
};
async function handleCheckView(context, args) {
    const result = await (0, handleCheckView_1.handleCheckView)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.view_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckView.js.map