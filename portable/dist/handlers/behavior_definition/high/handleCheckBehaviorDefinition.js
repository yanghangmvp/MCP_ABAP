"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckBehaviorDefinition = handleCheckBehaviorDefinition;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckBehaviorDefinition_1 = require("../low/handleCheckBehaviorDefinition");
exports.TOOL_DEFINITION = {
    name: 'CheckBehaviorDefinition',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP behavior definition (BDEF). Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'BehaviorDefinition name (e.g., ZI_MY_BDEF).',
            },
        },
        required: ['name'],
    },
};
async function handleCheckBehaviorDefinition(context, args) {
    const result = await (0, handleCheckBehaviorDefinition_1.handleCheckBehaviorDefinition)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.name?.toUpperCase());
}
//# sourceMappingURL=handleCheckBehaviorDefinition.js.map