"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerAtc = handleHandlerAtc;
const utils_1 = require("../../../lib/utils");
const handleGetAtcCustomizing_1 = require("../../system/readonly/handleGetAtcCustomizing");
const handleGetAtcWorklist_1 = require("../../system/readonly/handleGetAtcWorklist");
const handleRunAtc_1 = require("../../system/readonly/handleRunAtc");
const compactSchemas_1 = require("./compactSchemas");
exports.TOOL_DEFINITION = {
    name: 'HandlerAtc',
    available_in: ['onprem', 'cloud'],
    description: "ATC. operation='run' (needs object_name + object_type) | 'worklist' (needs worklist_id) | 'customizing'. Optional: check_variant, max_priority, summary. Response: JSON findings.",
    inputSchema: compactSchemas_1.compactAtcSchema,
};
async function handleHandlerAtc(context, args) {
    switch (args?.operation) {
        case 'run':
            if (!args.object_name || !args.object_type) {
                return (0, utils_1.return_error)(new Error("operation='run' requires object_name and object_type."));
            }
            return (0, handleRunAtc_1.handleRunAtc)(context, {
                object_name: args.object_name,
                object_type: args.object_type,
                check_variant: args.check_variant,
                max_priority: args.max_priority,
                summary: args.summary,
            });
        case 'worklist':
            if (!args.worklist_id) {
                return (0, utils_1.return_error)(new Error("operation='worklist' requires worklist_id."));
            }
            return (0, handleGetAtcWorklist_1.handleGetAtcWorklist)(context, {
                worklist_id: args.worklist_id,
            });
        case 'customizing':
            return (0, handleGetAtcCustomizing_1.handleGetAtcCustomizing)(context, {});
        default:
            return (0, utils_1.return_error)(new Error(`Unknown operation "${args?.operation}". Use 'run', 'worklist' or 'customizing'.`));
    }
}
//# sourceMappingURL=handleHandlerAtc.js.map