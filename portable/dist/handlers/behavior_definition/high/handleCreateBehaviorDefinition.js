"use strict";
/**
 * CreateBehaviorDefinition Handler - ABAP Behavior Definition Creation via ADT API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateBehaviorDefinition = handleCreateBehaviorDefinition;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateBehaviorDefinition',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: BehaviorDefinition. Will be useful for creating behavior definition. Create a new ABAP Behavior Definition (BDEF) in SAP system. Creates the behavior definition object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Behavior Definition name (usually same as Root Entity name)',
            },
            description: {
                type: 'string',
                description: 'Description',
            },
            package_name: {
                type: 'string',
                description: 'Package name',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number',
            },
            root_entity: {
                type: 'string',
                description: 'Root Entity name (CDS View name)',
            },
            implementation_type: {
                type: 'string',
                description: "Implementation type: 'Managed', 'Unmanaged', 'Abstract', 'Projection'",
                enum: ['Managed', 'Unmanaged', 'Abstract', 'Projection'],
            },
            activate: {
                type: 'boolean',
                description: 'Activate after creation. Default: true',
            },
        },
        required: ['name', 'package_name', 'root_entity', 'implementation_type'],
    },
};
async function handleCreateBehaviorDefinition(context, params) {
    const { connection, logger } = context;
    const args = params;
    if (!args.name ||
        !args.package_name ||
        !args.root_entity ||
        !args.implementation_type) {
        return (0, utils_1.return_error)(new Error('Missing required parameters'));
    }
    try {
        (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
    const name = args.name.toUpperCase();
    // Get connection from session context (set by ProtocolHandler)
    // Connection is managed and cached per session, with proper token refresh via AuthBroker
    logger?.info(`Starting BDEF creation: ${name}`);
    try {
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = args.activate !== false;
        // Create - using types from adt-clients
        const createConfig = {
            name,
            description: args.description || name,
            packageName: args.package_name,
            transportRequest: args.transport_request || '',
            rootEntity: args.root_entity,
            implementationType: args.implementation_type,
        };
        await client.getBehaviorDefinition().create(createConfig);
        // Lock - using types from adt-clients
        const lockConfig = { name };
        let activation;
        const lockHandle = await client.getBehaviorDefinition().lock(lockConfig);
        try {
            // Check (optional, but good practice) - using types from adt-clients
            const checkConfig = {
                name,
            };
            await client.getBehaviorDefinition().check(checkConfig);
            // Unlock - using types from adt-clients
            const unlockConfig = {
                name,
            };
            await client.getBehaviorDefinition().unlock(unlockConfig, lockHandle);
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getBehaviorDefinition()
                    .read({ name }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            // Activate if requested — and report SAP's verdict, not the request flag.
            if (shouldActivate) {
                activation = await (0, adtObjectOps_1.activateWrittenObject)(connection, name, 'BDEF', `Behavior Definition ${name}`, 'created');
            }
        }
        catch (error) {
            // Unlock on error (principle 1: if lock was done, unlock is mandatory)
            try {
                const unlockConfig = {
                    name,
                };
                await client.getBehaviorDefinition().unlock(unlockConfig, lockHandle);
            }
            catch (unlockError) {
                logger?.error(`Failed to unlock behavior definition after error: ${unlockError instanceof Error ? unlockError.message : String(unlockError)}`);
            }
            // Principle 2: first error and exit
            throw error;
        }
        const result = {
            success: true,
            name: name,
            package_name: args.package_name,
            type: 'BDEF',
            ...(0, adtObjectOps_1.writtenActivationFields)(activation),
            message: activation
                ? (0, adtMessages_1.describeActivation)(activation, `Behavior Definition ${name}`)
                : `Behavior Definition ${name} created successfully`,
        };
        logger?.info(`✅ CreateBehaviorDefinition completed successfully: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify(result, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`Error creating BDEF ${name}: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateBehaviorDefinition.js.map