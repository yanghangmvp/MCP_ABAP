"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckMetadataExtension = handleCheckMetadataExtension;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckMetadataExtension_1 = require("../low/handleCheckMetadataExtension");
exports.TOOL_DEFINITION = {
    name: 'CheckMetadataExtension',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP metadata extension (DDLX). Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Metadata extension name (e.g., ZC_MY_DDLX).',
            },
        },
        required: ['name'],
    },
};
async function handleCheckMetadataExtension(context, args) {
    const result = await (0, handleCheckMetadataExtension_1.handleCheckMetadataExtension)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.name?.toUpperCase());
}
//# sourceMappingURL=handleCheckMetadataExtension.js.map