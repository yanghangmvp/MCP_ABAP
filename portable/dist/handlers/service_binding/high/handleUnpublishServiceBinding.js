"use strict";
/**
 * UnpublishServiceBinding Handler
 *
 * Unpublish the OData service of a service binding (remove the local service
 * endpoint / gateway registration). Counterpart of PublishServiceBinding.
 *
 * Shares the publish/unpublish core (publishUnpublish) with
 * handlePublishServiceBinding; kept in its own file so each tool follows the
 * repo convention of one TOOL_DEFINITION per handler file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUnpublishServiceBinding = handleUnpublishServiceBinding;
const handlePublishServiceBinding_1 = require("./handlePublishServiceBinding");
exports.TOOL_DEFINITION = {
    name: 'UnpublishServiceBinding',
    available_in: ['onprem', 'cloud'],
    description: 'Unpublish the OData service of a service binding (remove the local service endpoint / gateway registration). Counterpart of PublishServiceBinding; same parameters.',
    inputSchema: {
        type: 'object',
        properties: {
            binding_name: {
                type: 'string',
                description: 'Service binding name (e.g. YUI_MFGR001_001).',
            },
            odata_version: {
                type: 'string',
                enum: ['v2', 'v4'],
                description: 'OData version of the binding. Default: v2.',
            },
            service_name: {
                type: 'string',
                description: 'V2 only: published service name if it differs from the binding name. Default: binding_name.',
            },
            service_version: {
                type: 'string',
                description: 'V2 only: service version. Default: 0001.',
            },
        },
        required: ['binding_name'],
    },
};
async function handleUnpublishServiceBinding(context, args) {
    return (0, handlePublishServiceBinding_1.publishUnpublish)(context, args, 'unpublish');
}
//# sourceMappingURL=handleUnpublishServiceBinding.js.map