"use strict";
/**
 * UpdateBehaviorDefinition Handler - ABAP Behavior Definition Update via ADT API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateBehaviorDefinition = handleUpdateBehaviorDefinition;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateBehaviorDefinition',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: BehaviorDefinition. Will be useful for updating or creating behavior definition. Update source code of an existing ABAP Behavior Definition (BDEF). Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Behavior Definition name',
            },
            source_code: {
                type: 'string',
                description: 'New source code',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            lock_handle: {
                type: 'string',
                description: 'Lock handle from LockObject. If not provided, will attempt to lock internally (not recommended for stateful flows).',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['name', 'source_code'],
    },
};
async function handleUpdateBehaviorDefinition(context, params) {
    const { connection, logger } = context;
    const args = params;
    if (!args.name || !args.source_code) {
        return (0, utils_1.return_error)(new Error('Missing required parameters'));
    }
    const name = args.name.toUpperCase();
    // Get connection from session context (set by ProtocolHandler)
    // Connection is managed and cached per session, with proper token refresh via AuthBroker
    logger?.info(`Starting BDEF update: ${name}`);
    try {
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = args.activate !== false;
        let lockHandle = args.lock_handle;
        // Lock if not provided - using types from adt-clients
        if (!lockHandle) {
            const lockConfig = {
                name,
            };
            lockHandle = await client.getBehaviorDefinition().lock(lockConfig);
        }
        try {
            // Update - using types from adt-clients
            const updateConfig = {
                name,
                sourceCode: args.source_code,
                transportRequest: args.transport_request,
            };
            await client
                .getBehaviorDefinition()
                .update(updateConfig, { lockHandle: lockHandle });
        }
        finally {
            // Always unlock if we locked it internally - using types from adt-clients
            if (!args.lock_handle && lockHandle) {
                try {
                    const unlockConfig = {
                        name,
                    };
                    await client.getBehaviorDefinition().unlock(unlockConfig, lockHandle);
                }
                catch (unlockError) {
                    logger?.warn(`Failed to unlock BDEF ${name}: ${unlockError?.message || unlockError}`);
                }
            }
        }
        // Wait for object to be ready after update (long polling)
        try {
            await client
                .getBehaviorDefinition()
                .read({ name }, 'inactive', { withLongPolling: true });
        }
        catch {
            // Continue anyway — activation will fail explicitly if object isn't ready
        }
        let activation;
        // Activate if requested - using types from adt-clients
        if (shouldActivate) {
            // Report SAP's verdict, not the request flag. Measured on DM2/310: a
            // reported success left the ACTIVE version as the ADT skeleton, still
            // carrying `//persistent table <???>`.
            activation = await (0, adtObjectOps_1.activateWrittenObject)(connection, name, 'BDEF', `Behavior Definition ${name}`, 'updated');
        }
        const result = {
            success: true,
            name: name,
            ...(0, adtObjectOps_1.writtenActivationFields)(activation),
            message: activation
                ? (0, adtMessages_1.describeActivation)(activation, `Behavior Definition ${name}`)
                : `Behavior Definition ${name} updated successfully`,
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
        const detailedError = (0, utils_1.extractAdtErrorMessage)(error, `Failed to update behavior definition ${name}`);
        logger?.error(`Error updating BDEF ${name}: ${detailedError}`);
        return (0, utils_1.return_error)(new Error(detailedError));
    }
}
//# sourceMappingURL=handleUpdateBehaviorDefinition.js.map