"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckDataElement = handleCheckDataElement;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckDataElement_1 = require("../low/handleCheckDataElement");
exports.TOOL_DEFINITION = {
    name: 'CheckDataElement',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP data element. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            data_element_name: {
                type: 'string',
                description: 'Data element name (e.g., ZDE_MY_ELEMENT).',
            },
        },
        required: ['data_element_name'],
    },
};
async function handleCheckDataElement(context, args) {
    const result = await (0, handleCheckDataElement_1.handleCheckDataElement)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.data_element_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckDataElement.js.map