"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateServiceBinding = handleCreateServiceBinding;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const serviceBindingPayloadUtils_1 = require("./serviceBindingPayloadUtils");
exports.TOOL_DEFINITION = {
    name: 'CreateServiceBinding',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: ServiceBinding. Will be useful for creating service binding. Create a new ABAP service binding in SAP system. Creates the service binding object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            service_binding_name: {
                type: 'string',
                description: 'Service binding name.',
            },
            service_definition_name: {
                type: 'string',
                description: 'Referenced service definition name.',
            },
            package_name: {
                type: 'string',
                description: 'ABAP package name.',
            },
            description: {
                type: 'string',
                description: 'Optional description. Defaults to service_binding_name when omitted.',
            },
            binding_variant: {
                type: 'string',
                enum: [
                    'ODATA_V2_UI',
                    'ODATA_V2_WEB_API',
                    'ODATA_V4_UI',
                    'ODATA_V4_WEB_API',
                ],
                description: 'Service binding variant. ODATA_V4_UI = OData V4 for Fiori Elements, ODATA_V4_WEB_API = OData V4 Web API, ODATA_V2_UI = OData V2 for Fiori Elements, ODATA_V2_WEB_API = OData V2 Web API.',
                default: 'ODATA_V4_UI',
            },
            service_name: {
                type: 'string',
                description: 'Published service name. Default: service_binding_name if omitted.',
            },
            service_version: {
                type: 'string',
                description: 'Published service version. Default: 0001.',
            },
            transport_request: {
                type: 'string',
                description: 'Optional transport request for transport checks.',
            },
            activate: {
                type: 'boolean',
                description: 'Activate service binding after create. Default: true.',
                default: true,
            },
            response_format: {
                type: 'string',
                enum: ['xml', 'json', 'plain'],
                default: 'xml',
            },
        },
        required: [
            'service_binding_name',
            'service_definition_name',
            'package_name',
        ],
    },
};
async function handleCreateServiceBinding(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.service_binding_name) {
            throw new Error('service_binding_name is required');
        }
        if (!args?.service_definition_name) {
            throw new Error('service_definition_name is required');
        }
        if (!args?.package_name) {
            throw new Error('package_name is required');
        }
        const serviceBindingName = args.service_binding_name.trim().toUpperCase();
        const serviceDefinitionName = args.service_definition_name
            .trim()
            .toUpperCase();
        const packageName = args.package_name.trim().toUpperCase();
        const responseFormat = args.response_format ?? 'xml';
        const bindingVariant = args.binding_variant ?? 'ODATA_V4_UI';
        const serviceName = (args.service_name || serviceBindingName)
            .trim()
            .toUpperCase();
        const serviceVersion = (args.service_version || '0001').trim();
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const state = await client.getServiceBinding().create({
            bindingName: serviceBindingName,
            packageName: packageName,
            description: (args.description || serviceBindingName).trim(),
            serviceDefinitionName,
            serviceName,
            serviceVersion,
            bindingVariant,
            transportRequest: args.transport_request,
        }, { activateOnCreate: args.activate !== false });
        const response = state.createResult;
        if (!response) {
            throw new Error(`Create did not return a response for service binding ${serviceBindingName}`);
        }
        // Verify the activation instead of echoing the request flag: the dep's
        // `activateOnCreate` performs the activation internally and never exposes
        // its outcome, so `activated: args.activate !== false` reported the caller's
        // own input. Re-running the activation through our own parser gives SAP's
        // verdict — an already-active binding answers activated:false with no
        // messages (a harmless no-op), a refused one surfaces its errors.
        const shouldActivate = args.activate !== false;
        const activation = shouldActivate
            ? await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
                { name: serviceBindingName, type: 'SRVB/SVB' },
            ])
            : undefined;
        if (activation && !activation.success) {
            throw new Error(`Service binding ${serviceBindingName} was created but ACTIVATION FAILED: ` +
                `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The binding is left inactive.`);
        }
        const readPayload = state.readResult
            ? (0, serviceBindingPayloadUtils_1.parseServiceBindingPayload)(state.readResult.data, responseFormat)
            : undefined;
        const generatedPayload = state.generatedInfoResult
            ? (0, serviceBindingPayloadUtils_1.parseServiceBindingPayload)(state.generatedInfoResult.data, responseFormat)
            : undefined;
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                service_binding_name: serviceBindingName,
                service_definition_name: serviceDefinitionName,
                package_name: packageName,
                binding_variant: bindingVariant,
                service_name: serviceName,
                service_version: serviceVersion,
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                activation_warnings: activation?.warnings.length
                    ? activation.warnings
                    : undefined,
                response_format: responseFormat,
                status: response.status,
                payload: (0, serviceBindingPayloadUtils_1.parseServiceBindingPayload)(response.data, responseFormat),
                read_payload: readPayload,
                generated_info: generatedPayload,
            }, null, 2),
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
        });
    }
    catch (error) {
        logger?.error('Error creating service binding:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateServiceBinding.js.map