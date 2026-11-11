"use strict";
/**
 * UpdateBehaviorImplementation Handler - Update Existing ABAP Behavior Implementation
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: lock -> update main source -> update implementations -> check -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateBehaviorImplementation = handleUpdateBehaviorImplementation;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateBehaviorImplementation',
    available_in: ['onprem', 'cloud'],
    description: 'Update source code of an existing ABAP behavior implementation class. Updates both main source (with FOR BEHAVIOR OF clause) and implementations include. Uses stateful session with proper lock/unlock mechanism.',
    inputSchema: {
        type: 'object',
        properties: {
            class_name: {
                type: 'string',
                description: 'Behavior Implementation class name (e.g., ZBP_MY_ENTITY). Must exist in the system.',
            },
            behavior_definition: {
                type: 'string',
                description: 'Behavior Definition name (e.g., ZI_MY_ENTITY). Must match the behavior definition used when creating the class.',
            },
            implementation_code: {
                type: 'string',
                description: 'Implementation code for the implementations include. Contains the actual behavior implementation methods.',
            },
            main_source: {
                type: 'string',
                description: 'OPTIONAL full global-class source (the CLASS ... DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF ... body). Provide this ONLY when the behavior pool needs a custom PUBLIC SECTION (e.g. a public CLASS-DATA the CCIMP references). When omitted, a bare skeleton is generated (correct for most pools). When given, the global class is written via getClass().update + getLocalTypes().update instead of the skeleton-overwriting path.',
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
        required: ['class_name', 'behavior_definition', 'implementation_code'],
    },
};
/**
 * Main handler for UpdateBehaviorImplementation MCP tool
 *
 * Uses AdtClient for all operations
 * Session and lock management handled internally by client
 */
async function handleUpdateBehaviorImplementation(context, args) {
    const { connection, logger } = context;
    try {
        const { class_name, behavior_definition, implementation_code, main_source, transport_request, activate = true, } = args;
        // Validation
        if (!class_name || !behavior_definition || !implementation_code) {
            return (0, utils_1.return_error)(new Error('class_name, behavior_definition, and implementation_code are required'));
        }
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        const className = class_name.toUpperCase();
        const behaviorDefinition = behavior_definition.toUpperCase();
        logger?.info(`Starting behavior implementation source update: ${className} for ${behaviorDefinition}`);
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Update behavior implementation using AdtClient chain
            const shouldActivate = activate !== false; // Default to true if not specified
            // When a custom main_source is supplied, DO NOT use
            // getBehaviorImplementation().update() — it hardcodes the global class body
            // to a bare skeleton (CLASS … DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR
            // OF …. ENDCLASS. …), which would drop any custom PUBLIC SECTION (e.g. a
            // public CLASS-DATA the CCIMP references, as in the additional-save RAP
            // example). Instead write the global class body via getClass().update
            // (inactive) and the CCIMP via getLocalTypes().update — the validated
            // workaround, now done in a single tool call.
            let activateResponse;
            if (main_source && main_source.trim()) {
                logger?.info(`Using custom main_source path (UpdateClass + UpdateLocalTypes) for ${className}`);
                let lockHandle;
                try {
                    lockHandle = await client.getClass().lock({ className });
                    await client.getClass().update({
                        className,
                        sourceCode: main_source,
                        transportRequest: transport_request,
                    }, { lockHandle });
                }
                finally {
                    if (lockHandle) {
                        try {
                            await client.getClass().unlock({ className }, lockHandle);
                        }
                        catch (unlockError) {
                            logger?.warn(`Failed to unlock class ${className}: ${unlockError?.message || unlockError}`);
                        }
                    }
                }
                // CCIMP (implementations include) + activate the class as a whole.
                const localResult = await client.getLocalTypes().update({
                    className,
                    localTypesCode: implementation_code,
                    transportRequest: transport_request,
                }, { activateOnUpdate: shouldActivate });
                activateResponse = localResult?.activateResult;
            }
            else {
                const updateState = await client.getBehaviorImplementation().update({
                    className,
                    behaviorDefinition,
                    implementationCode: implementation_code,
                    transportRequest: transport_request,
                }, { activateOnUpdate: shouldActivate });
                activateResponse = updateState.activateResult;
            }
            // Evaluate SAP's ACTUAL activation result.
            //
            // Both write paths delegate activation to the dep via
            // `{ activateOnUpdate }`, whose response was only ever scraped for
            // display-only warnings while the reported `activated` field was a copy of
            // the caller's own request flag — so an activation SAP refused was still
            // announced as success. Prefer the response the dep handed back; when it
            // did not expose one, re-run the activation through our own parser
            // (already-active answers activated:false with no messages, a harmless
            // no-op, while a refused activation surfaces its errors).
            let activation;
            if (shouldActivate) {
                activation = activateResponse
                    ? (0, adtObjectOps_1.evaluateActivationResponse)(activateResponse)
                    : await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
                        { name: className, type: 'CLAS/OC' },
                    ]);
                if (!activation.success) {
                    throw new Error(`Behavior implementation ${className} was updated but ACTIVATION FAILED: ` +
                        `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The class is left inactive.`);
                }
            }
            const activationWarnings = activation?.warnings.length
                ? activation.warnings.map((m) => `${m.type}: ${m.text}`)
                : [];
            logger?.info(`✅ UpdateBehaviorImplementation completed successfully: ${className}`);
            // Return success result
            const stepsCompleted = [
                'lock',
                'update_main_source',
                'update_implementations',
                'check',
                'unlock',
            ];
            if (shouldActivate) {
                stepsCompleted.push('activate');
            }
            const result = {
                success: true,
                class_name: className,
                behavior_definition: behaviorDefinition,
                transport_request: transport_request || 'local',
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                message: activation
                    ? `Behavior Implementation ${className} updated; ${(0, adtMessages_1.describeActivation)(activation, `behavior implementation ${className}`)}`
                    : `Behavior Implementation ${className} updated successfully (not activated)`,
                uri: `/sap/bc/adt/oo/classes/${(0, utils_1.encodeSapObjectName)(className).toLowerCase()}`,
                steps_completed: stepsCompleted,
                activation_warnings: activationWarnings.length > 0 ? activationWarnings : undefined,
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
            logger?.error(`Error updating behavior implementation source ${className}: ${error?.message || error}`);
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to update behavior implementation: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateBehaviorImplementation.js.map