"use strict";
/**
 * UpdateMetadataExtension Handler - ABAP Metadata Extension Update via ADT API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateMetadataExtension = handleUpdateMetadataExtension;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateMetadataExtension',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: MetadataExtension. Will be useful for updating or creating metadata extension. Update source code of an existing ABAP Metadata Extension (DDLX). Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Metadata Extension name',
            },
            source_code: {
                type: 'string',
                description: 'New source code',
            },
            lock_handle: {
                type: 'string',
                description: 'Lock handle from LockObject. If not provided, will attempt to lock internally.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (required for transportable packages).',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['name', 'source_code'],
    },
};
async function handleUpdateMetadataExtension(context, params) {
    const { connection, logger } = context;
    const args = params;
    if (!args.name || !args.source_code) {
        return (0, utils_1.return_error)(new Error('Missing required parameters'));
    }
    const name = args.name.toUpperCase();
    try {
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = args.activate !== false;
        let lockHandle = args.lock_handle;
        // Lock if not provided
        if (!lockHandle) {
            lockHandle = await client.getMetadataExtension().lock({ name: name });
        }
        try {
            // Update
            await client.getMetadataExtension().update({
                name,
                sourceCode: args.source_code,
                transportRequest: args.transport_request,
            }, { lockHandle });
        }
        finally {
            // Always unlock if we locked it internally
            if (!args.lock_handle && lockHandle) {
                try {
                    await client
                        .getMetadataExtension()
                        .unlock({ name: name }, lockHandle);
                }
                catch (unlockError) {
                    logger?.warn(`Failed to unlock DDLX ${name}: ${unlockError?.message || unlockError}`);
                }
            }
        }
        // Wait for object to be ready after update (long polling)
        try {
            await client
                .getMetadataExtension()
                .read({ name }, 'inactive', { withLongPolling: true });
        }
        catch {
            // Continue anyway — activation will fail explicitly if object isn't ready
        }
        // Activate if requested — and report SAP's verdict, not the request flag.
        // Measured on DM2/310: five of eight metadata extensions reported
        // "updated and activated successfully" while SAP had rejected them with
        // "Annotation 'UI.facet.id' used at wrong position".
        const activation = shouldActivate
            ? await (0, adtObjectOps_1.activateWrittenObject)(connection, name, 'DDLX', `Metadata Extension ${name}`, 'updated')
            : undefined;
        const result = {
            success: true,
            name: name,
            ...(0, adtObjectOps_1.writtenActivationFields)(activation),
            message: activation
                ? (0, adtMessages_1.describeActivation)(activation, `Metadata Extension ${name}`)
                : `Metadata Extension ${name} updated successfully`,
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
        const detailedError = (0, utils_1.extractAdtErrorMessage)(error, `Failed to update metadata extension ${name}`);
        logger?.error(`Error updating DDLX ${name}: ${detailedError}`);
        return (0, utils_1.return_error)(new Error(detailedError));
    }
}
//# sourceMappingURL=handleUpdateMetadataExtension.js.map