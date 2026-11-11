"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckClass = handleCheckClass;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckClass_1 = require("../low/handleCheckClass");
exports.TOOL_DEFINITION = {
    name: 'CheckClass',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP class. Checks the stored version, or a source you supply for an existing class. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            class_name: {
                type: 'string',
                description: 'Class name (e.g., ZCL_MY_CLASS).',
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' (last activated) or 'inactive' (current unsaved). Default: active.",
                enum: ['active', 'inactive'],
            },
            source_code: {
                type: 'string',
                description: 'Optional: source to check INSTEAD of the stored version. The object must ALREADY EXIST — a checkrun against a name SAP does not know answers "Resource ... does not exist" whatever version is asked for (measured on 7.58), so this validates a CHANGE, not a hypothetical new object. Must include complete CLASS DEFINITION and IMPLEMENTATION sections.',
            },
        },
        required: ['class_name'],
    },
};
async function handleCheckClass(context, args) {
    const result = await (0, handleCheckClass_1.handleCheckClass)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.class_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckClass.js.map