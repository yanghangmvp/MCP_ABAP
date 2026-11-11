"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckProgram = handleCheckProgram;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckProgram_1 = require("../low/handleCheckProgram");
exports.TOOL_DEFINITION = {
    name: 'CheckProgram',
    available_in: ['onprem', 'legacy'],
    description: 'Perform syntax check on an ABAP program. Returns syntax errors, warnings, and messages. Not available on cloud.',
    inputSchema: {
        type: 'object',
        properties: {
            program_name: {
                type: 'string',
                description: 'Program name (e.g., ZMCP_MY_PROGRAM).',
            },
        },
        required: ['program_name'],
    },
};
async function handleCheckProgram(context, args) {
    const result = await (0, handleCheckProgram_1.handleCheckProgram)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.program_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckProgram.js.map