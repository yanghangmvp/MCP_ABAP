"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckFunctionGroup = handleCheckFunctionGroup;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckFunctionGroup_1 = require("../low/handleCheckFunctionGroup");
exports.TOOL_DEFINITION = {
    name: 'CheckFunctionGroup',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP function group. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            function_group_name: {
                type: 'string',
                description: 'Function group name (e.g., ZFGRP_MY_GROUP).',
            },
        },
        required: ['function_group_name'],
    },
};
async function handleCheckFunctionGroup(context, args) {
    const result = await (0, handleCheckFunctionGroup_1.handleCheckFunctionGroup)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.function_group_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckFunctionGroup.js.map