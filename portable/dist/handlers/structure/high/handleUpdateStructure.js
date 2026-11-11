"use strict";
/**
 * UpdateStructure Handler - Update Existing ABAP Structure DDL Source
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateStructure = handleUpdateStructure;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const checkRunParser_1 = require("../../../lib/checkRunParser");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateStructure',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update, Create. Subject: Structure. Will be useful for updating or creating structure. Update DDL source code of an existing ABAP structure. Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            structure_name: {
                type: 'string',
                description: 'Structure name (e.g., ZZ_S_TEST_001). Structure must already exist.',
            },
            ddl_code: {
                type: 'string',
                description: "Complete DDL source code for structure. Example: '@EndUserText.label : \\'My Structure\\' @AbapCatalog.tableCategory : #TRANSPARENT define structure zz_s_test_001 { client : abap.clnt not null; id : abap.char(10); name : abap.char(255); }'",
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['structure_name', 'ddl_code'],
    },
};
/**
 * Main handler for UpdateStructure MCP tool
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleUpdateStructure(context, args) {
    const { connection, logger } = context;
    try {
        const { structure_name, ddl_code, transport_request, activate = true, } = args;
        // Validation
        if (!structure_name || !ddl_code) {
            return (0, utils_1.return_error)(new Error('structure_name and ddl_code are required'));
        }
        const structureName = structure_name.toUpperCase();
        const objectUri = `/sap/bc/adt/ddic/structures/${(0, utils_1.encodeSapObjectName)(structureName)}`;
        logger?.info(`Starting structure source update: ${structureName}`);
        try {
            // Get configuration from environment variables
            // Create logger for connection (only logs when DEBUG_CONNECTORS is enabled)
            // Create connection directly for this handler call
            // Get connection from session context (set by ProtocolHandler)
            // Connection is managed and cached per session, with proper token refresh via AuthBroker
            logger?.debug(`[UpdateStructure] Created separate connection for handler call: ${structureName}`);
        }
        catch (connectionError) {
            const errorMessage = connectionError instanceof Error
                ? connectionError.message
                : String(connectionError);
            logger?.error(`[UpdateStructure] Failed to create connection: ${errorMessage}`);
            return (0, utils_1.return_error)(new Error(`Failed to create connection: ${errorMessage}`));
        }
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Build operation chain: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
            // Note: No validation needed for update - structure must already exist
            const shouldActivate = activate !== false; // Default to true if not specified
            let activateResponse;
            let lockHandle;
            try {
                // Lock
                lockHandle = await client.getStructure().lock({ structureName });
                // Step 1: Check the SUBMITTED DDL before the update (only when activating).
                //
                // This deliberately does NOT go through client.getStructure().check():
                // that wrapper accepts a ddlCode in its config and then passes
                // `undefined` as the source to the underlying checkrun, so it always
                // checked the version already STORED on the server. A structure whose
                // stored inactive version was broken could therefore never be repaired
                // through UpdateStructure — the pre-check kept reporting the OLD
                // version's errors and aborted before the new DDL was ever written,
                // leaving the object un-updatable (and, with the deletion bug,
                // un-deletable too). runObjectCheckRun with a source argument checks
                // what the caller is actually submitting.
                if (shouldActivate) {
                    logger?.info(`[UpdateStructure] Checking submitted DDL before update: ${structureName}`);
                    const preCheck = (0, checkRunParser_1.parseCheckRunResponse)(await (0, adtObjectOps_1.runObjectCheckRun)(connection, objectUri, 'inactive', ddl_code));
                    if (preCheck.has_errors) {
                        throw new Error(`Submitted DDL for ${structureName} has ${preCheck.errors.length} error(s): ` +
                            preCheck.errors.map((e) => e.text).join('; '));
                    }
                    logger?.info(`[UpdateStructure] Submitted DDL check passed: ${structureName}`);
                }
                else {
                    logger?.info(`[UpdateStructure] Skipping syntax check (activate=false): ${structureName}`);
                }
                // Step 2: Update
                logger?.info(`[UpdateStructure] Updating structure with DDL code: ${structureName}`);
                await client.getStructure().update({
                    structureName,
                    ddlCode: ddl_code,
                    transportRequest: args.transport_request,
                }, { lockHandle });
                logger?.info(`[UpdateStructure] Structure source code updated: ${structureName}`);
            }
            finally {
                if (lockHandle) {
                    try {
                        await client.getStructure().unlock({ structureName }, lockHandle);
                        logger?.info(`[UpdateStructure] Structure unlocked: ${structureName}`);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock structure ${structureName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Step 4: Check the stored inactive version (after unlock). Informational
            // only — the authoritative verdict is the activation result below.
            if (shouldActivate) {
                logger?.info(`[UpdateStructure] Checking inactive version: ${structureName}`);
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getStructure().check({ structureName }, 'inactive'), structureName, {
                        debug: (message) => logger?.debug(`[UpdateStructure] ${message}`),
                    });
                    logger?.info(`[UpdateStructure] Inactive version check completed: ${structureName}`);
                }
                catch (checkError) {
                    if (checkError.isAlreadyChecked) {
                        logger?.info(`[UpdateStructure] Structure ${structureName} was already checked - this is OK, continuing`);
                    }
                    else {
                        logger?.warn(`[UpdateStructure] Inactive version check had issues: ${structureName}`, {
                            error: checkError instanceof Error
                                ? checkError.message
                                : String(checkError),
                        });
                    }
                }
            }
            // Activate if requested — and REPORT WHAT SAP SAID.
            //
            // Previously the activation response was discarded and the result field
            // was `activated: shouldActivate`, i.e. a copy of the caller's own request
            // flag. Measured live, that made UpdateStructure(activate:true) claim
            // success for 9 of 9 DDL variants when only 2 had actually activated.
            let activation;
            if (shouldActivate) {
                const activateState = await client
                    .getStructure()
                    .activate({ structureName });
                activateResponse = activateState.activateResult;
                activation = (0, adtObjectOps_1.evaluateActivationResponse)(activateResponse);
                if (!activation.success) {
                    // The source WAS written; only activation failed. Say exactly that —
                    // the caller must not read this as "nothing happened".
                    throw new Error(`Structure ${structureName} source was updated but ACTIVATION FAILED: ` +
                        `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The structure is left inactive; ` +
                        `fix the DDL and update again.`);
                }
            }
            const activationWarnings = activation?.warnings.length
                ? activation.warnings.map((m) => `${m.type}: ${m.text}`)
                : [];
            logger?.info(`✅ UpdateStructure completed successfully: ${structureName}`);
            // Return success result
            const stepsCompleted = [
                'lock',
                'check_new_code',
                'update',
                'unlock',
                'check_inactive',
            ];
            if (shouldActivate) {
                stepsCompleted.push('activate');
            }
            const result = {
                success: true,
                structure_name: structureName,
                transport_request: transport_request || 'local',
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                message: activation
                    ? `Structure ${structureName} source updated; ${(0, adtMessages_1.describeActivation)(activation, `structure ${structureName}`)}`
                    : `Structure ${structureName} source updated successfully (not activated)`,
                uri: `/sap/bc/adt/ddic/structures/${(0, utils_1.encodeSapObjectName)(structureName)}`,
                steps_completed: stepsCompleted,
                activation_warnings: activationWarnings.length > 0 ? activationWarnings : undefined,
                source_size_bytes: ddl_code.length,
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
            logger?.error(`Error updating structure source ${structureName}:`, error);
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to update structure: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateStructure.js.map