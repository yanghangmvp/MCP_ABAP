"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckFunctionModule = handleCheckFunctionModule;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckFunctionModule_1 = require("../low/handleCheckFunctionModule");
exports.TOOL_DEFINITION = {
    name: 'CheckFunctionModule',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP function module. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            function_group_name: {
                type: 'string',
                description: 'Function group name containing the function module.',
            },
            function_module_name: {
                type: 'string',
                description: 'Function module name (e.g., Z_MY_FUNCTION).',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' or 'inactive'. Default: active.",
                enum: ['active', 'inactive'],
            },
        },
        required: ['function_group_name', 'function_module_name'],
    },
};
async function handleCheckFunctionModule(context, args) {
    const result = await (0, handleCheckFunctionModule_1.handleCheckFunctionModule)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.function_module_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckFunctionModule.js.map