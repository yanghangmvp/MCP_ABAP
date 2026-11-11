"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckInterface = handleCheckInterface;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckInterface_1 = require("../low/handleCheckInterface");
exports.TOOL_DEFINITION = {
    name: 'CheckInterface',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP interface. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            interface_name: {
                type: 'string',
                description: 'Interface name (e.g., ZIF_MY_INTERFACE).',
            },
        },
        required: ['interface_name'],
    },
};
async function handleCheckInterface(context, args) {
    const result = await (0, handleCheckInterface_1.handleCheckInterface)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.interface_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckInterface.js.map