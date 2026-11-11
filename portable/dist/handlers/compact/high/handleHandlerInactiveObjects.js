"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleHandlerInactiveObjects = handleHandlerInactiveObjects;
const handleGetInactiveObjects_1 = require("../../system/readonly/handleGetInactiveObjects");
const compactSchemas_1 = require("./compactSchemas");
/**
 * Kept as its own operation rather than folded into a routed handler: this is
 * the sweep. It is the one call in the reporting project's process that does not
 * take another tool's word for anything, and it is why the compact facade could
 * not be their default (field report round 7, F-9).
 */
exports.TOOL_DEFINITION = {
    name: 'HandlerInactiveObjects',
    available_in: ['onprem', 'cloud'],
    description: 'List objects left INACTIVE in the system — the sweep that catches what a failed write left behind. Optional: name_prefix, object_type. Response: JSON list with uri.',
    inputSchema: compactSchemas_1.compactInactiveSchema,
};
async function handleHandlerInactiveObjects(context, args) {
    return (0, handleGetInactiveObjects_1.handleGetInactiveObjects)(context, {
        name_prefix: args?.name_prefix,
        object_type: args?.object_type,
    });
}
//# sourceMappingURL=handleHandlerInactiveObjects.js.map