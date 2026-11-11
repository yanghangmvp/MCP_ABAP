"use strict";
/**
 * CreateServiceDefinition Handler - ABAP Service Definition Creation via ADT API
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: validate -> create -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateServiceDefinition = handleCreateServiceDefinition;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateServiceDefinition',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: ServiceDefinition. Will be useful for creating service definition. Create a new ABAP service definition in SAP system. Creates the service definition object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            service_definition_name: {
                type: 'string',
                description: 'Service definition name (e.g., ZSD_MY_SERVICE). Must follow SAP naming conventions (start with Z or Y).',
            },
            description: {
                type: 'string',
                description: 'Service definition description. If not provided, service_definition_name will be used.',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            source_code: {
                type: 'string',
                description: 'Service definition source code (optional). If not provided, a minimal template will be created.',
            },
            activate: {
                type: 'boolean',
                description: 'Activate service definition after creation. Default: true.',
            },
        },
        required: ['service_definition_name', 'package_name'],
    },
};
/**
 * Main handler for CreateServiceDefinition MCP tool
 *
 * Uses AdtClient.createServiceDefinition
 */
async function handleCreateServiceDefinition(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.service_definition_name) {
            return (0, utils_1.return_error)(new Error('service_definition_name is required'));
        }
        if (!args?.package_name) {
            return (0, utils_1.return_error)(new Error('package_name is required'));
        }
        // Validate transport_request: required for non-$TMP packages
        try {
            (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        }
        catch (error) {
            return (0, utils_1.return_error)(error);
        }
        const typedArgs = args;
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        const serviceDefinitionName = typedArgs.service_definition_name.toUpperCase();
        logger?.info(`Starting service definition creation: ${serviceDefinitionName}`);
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            const shouldActivate = typedArgs.activate !== false; // Default to true if not specified
            // Validate — fail fast BEFORE create if the name is taken.
            await (0, utils_1.assertObjectDoesNotExist)(`Service definition ${serviceDefinitionName}`, () => client.getServiceDefinition().validate({
                serviceDefinitionName,
                description: typedArgs.description || serviceDefinitionName,
            }), connection);
            // Create
            const createConfig = {
                serviceDefinitionName,
                description: typedArgs.description || serviceDefinitionName,
                packageName: typedArgs.package_name.toUpperCase(),
                transportRequest: typedArgs.transport_request,
                ...(typedArgs.source_code && { sourceCode: typedArgs.source_code }),
            };
            const createState = await client
                .getServiceDefinition()
                .create(createConfig);
            const createResult = createState.createResult;
            if (!createResult) {
                throw new Error(`Create did not return a response for service definition ${serviceDefinitionName}`);
            }
            // Activate if requested — and report SAP's verdict, not the request flag.
            //
            // This used to scrape `<chkl:messages>` for WARNINGS only and report
            // success regardless, so a rejected service definition still came back as
            // "created and activated successfully".
            const activation = shouldActivate
                ? await (0, adtObjectOps_1.activateWrittenObject)(connection, serviceDefinitionName, 'SRVD', `Service Definition ${serviceDefinitionName}`, 'created')
                : undefined;
            logger?.info(`✅ CreateServiceDefinition completed successfully: ${serviceDefinitionName}`);
            // Return success result
            const stepsCompleted = ['validate', 'create'];
            if (shouldActivate) {
                stepsCompleted.push('activate');
            }
            const result = {
                success: true,
                service_definition_name: serviceDefinitionName,
                package_name: typedArgs.package_name.toUpperCase(),
                transport_request: typedArgs.transport_request || null,
                type: 'SRVD/SRV',
                ...(0, adtObjectOps_1.writtenActivationFields)(activation),
                message: activation
                    ? (0, adtMessages_1.describeActivation)(activation, `Service Definition ${serviceDefinitionName}`)
                    : `Service Definition ${serviceDefinitionName} created successfully (not activated)`,
                uri: `/sap/bc/adt/ddic/srvd/sources/${(0, utils_1.encodeSapObjectName)(serviceDefinitionName)}`,
                steps_completed: stepsCompleted,
            };
            return (0, utils_1.return_response)({
                data: JSON.stringify(result, null, 2),
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            });
        }
        catch (error) {
            logger?.error(`Error creating service definition ${serviceDefinitionName}:`, error);
            // Check if service definition already exists
            if (error.message?.includes('already exists') ||
                error.response?.status === 409) {
                return (0, utils_1.return_error)(new Error(`Service Definition ${serviceDefinitionName} already exists. Please delete it first or use a different name.`));
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to create service definition: ${errorMessage}`));
        }
    }
    catch (error) {
        logger?.error('CreateServiceDefinition handler error:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateServiceDefinition.js.map