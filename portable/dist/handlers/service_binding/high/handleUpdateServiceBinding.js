"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateServiceBinding = handleUpdateServiceBinding;
const interfaces_1 = require("@mcp-abap-adt/interfaces");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const serviceBindingPayloadUtils_1 = require("./serviceBindingPayloadUtils");
exports.TOOL_DEFINITION = {
    name: 'UpdateServiceBinding',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: ServiceBinding. Will be useful for updating or creating service binding. Update publication state of an existing ABAP service binding.',
    inputSchema: {
        type: 'object',
        properties: {
            service_binding_name: {
                type: 'string',
                description: 'Service binding name to update.',
            },
            desired_publication_state: {
                type: 'string',
                enum: ['published', 'unpublished', 'unchanged'],
                description: 'Target publication state.',
            },
            binding_variant: {
                type: 'string',
                enum: [
                    'ODATA_V2_UI',
                    'ODATA_V2_WEB_API',
                    'ODATA_V4_UI',
                    'ODATA_V4_WEB_API',
                ],
                description: 'Service binding variant. Determines OData version for publish/unpublish routing.',
                default: 'ODATA_V4_UI',
            },
            service_name: {
                type: 'string',
                description: 'Published service name.',
            },
            service_version: {
                type: 'string',
                description: 'Published service version. Optional.',
            },
            response_format: {
                type: 'string',
                enum: ['xml', 'json', 'plain'],
                default: 'xml',
            },
        },
        required: [
            'service_binding_name',
            'desired_publication_state',
            'binding_variant',
            'service_name',
        ],
    },
};
async function handleUpdateServiceBinding(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.service_binding_name) {
            throw new Error('service_binding_name is required');
        }
        if (!args?.desired_publication_state) {
            throw new Error('desired_publication_state is required');
        }
        if (!args?.service_name) {
            throw new Error('service_name is required');
        }
        const serviceBindingName = args.service_binding_name.trim().toUpperCase();
        const responseFormat = args.response_format ?? 'xml';
        const bindingVariant = args.binding_variant ?? 'ODATA_V4_UI';
        const { serviceType } = interfaces_1.SERVICE_BINDING_VARIANT_MAP[bindingVariant];
        const serviceName = args.service_name.trim().toUpperCase();
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const response = await client.getServiceBinding().updateServiceBinding({
            bindingName: serviceBindingName,
            desiredPublicationState: args.desired_publication_state,
            serviceType,
            serviceName,
            serviceVersion: args.service_version?.trim() || undefined,
        });
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                service_binding_name: serviceBindingName,
                desired_publication_state: args.desired_publication_state,
                binding_variant: bindingVariant,
                service_name: serviceName,
                service_version: args.service_version || null,
                response_format: responseFormat,
                status: response.status,
                payload: (0, serviceBindingPayloadUtils_1.parseServiceBindingPayload)(response.data, responseFormat),
            }, null, 2),
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
        });
    }
    catch (error) {
        logger?.error('Error updating service binding:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateServiceBinding.js.map