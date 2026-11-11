"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerRuntime = handleHandlerRuntime;
const utils_1 = require("../../../lib/utils");
const handleRuntimeRunClass_1 = require("../../system/readonly/handleRuntimeRunClass");
const handleRuntimeRunProgram_1 = require("../../system/readonly/handleRuntimeRunProgram");
const compactSchemas_1 = require("./compactSchemas");
exports.TOOL_DEFINITION = {
    name: 'HandlerRuntime',
    available_in: ['onprem'],
    description: "Execute. object_type='program' (onprem only) or 'class' (needs IF_OO_ADT_CLASSRUN). Required: object_name. Optional: profile, description. Response: JSON output.",
    inputSchema: compactSchemas_1.compactRuntimeSchema,
};
async function handleHandlerRuntime(context, args) {
    if (!args?.object_name) {
        return (0, utils_1.return_error)(new Error('object_name is required.'));
    }
    switch (args?.object_type) {
        case 'program':
            return (0, handleRuntimeRunProgram_1.handleRuntimeRunProgram)(context, {
                program_name: args.object_name,
                profile: args.profile,
                description: args.description,
            });
        case 'class':
            return (0, handleRuntimeRunClass_1.handleRuntimeRunClass)(context, {
                class_name: args.object_name,
                profile: args.profile,
                description: args.description,
            });
        default:
            return (0, utils_1.return_error)(new Error(`Unknown object_type "${args?.object_type}". Use 'program' or 'class'.`));
    }
}
//# sourceMappingURL=handleHandlerRuntime.js.map