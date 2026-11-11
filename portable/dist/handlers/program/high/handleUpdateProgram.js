"use strict";
/**
 * UpdateProgram Handler - Update Existing ABAP Program Source Code
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive) -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateProgram = handleUpdateProgram;
const fast_xml_parser_1 = require("fast-xml-parser");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateProgram',
    available_in: ['onprem', 'legacy'],
    description: 'Operation: Update, Create. Subject: Program. Will be useful for updating or creating program. Update source code of an existing ABAP program. Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            program_name: {
                type: 'string',
                description: 'Program name (e.g., Z_TEST_PROGRAM_001). Program must already exist.',
            },
            source_code: {
                type: 'string',
                description: 'Complete ABAP program source code.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: FALSE — omitting it leaves the object INACTIVE, so pass true explicitly if you want it usable. (Update* tools are not consistent on this default: DDIC tools such as UpdateTable / UpdateStructure default to true.) The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['program_name', 'source_code'],
    },
};
async function handleUpdateProgram(context, params) {
    const { connection, logger } = context;
    const args = params;
    // Validate required parameters
    if (!args.program_name || !args.source_code) {
        return (0, utils_1.return_error)(new Error('Missing required parameters: program_name and source_code'));
    }
    // Check if cloud - programs are not available on cloud systems
    if ((0, utils_1.isCloudConnection)()) {
        return (0, utils_1.return_error)(new Error('Programs are not available on cloud systems (ABAP Cloud). This operation is only supported on on-premise systems.'));
    }
    const programName = args.program_name.toUpperCase();
    logger?.info(`Starting program source update: ${programName} (activate=${args.activate === true})`);
    // Connection setup
    try {
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        logger?.debug(`Created separate connection for handler call: ${programName}`);
    }
    catch (connectionError) {
        const errorMessage = connectionError instanceof Error
            ? connectionError.message
            : String(connectionError);
        logger?.error(`Failed to create connection: ${errorMessage}`);
        return (0, utils_1.return_error)(new Error(`Failed to create connection: ${errorMessage}`));
    }
    try {
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const shouldActivate = args.activate === true; // Default to false if not specified
        let lockHandle;
        let activateResponse;
        try {
            // Lock
            logger?.debug(`Locking program: ${programName}`);
            lockHandle = await client.getProgram().lock({ programName });
            logger?.debug(`Program locked: ${programName} (handle=${lockHandle ? `${lockHandle.substring(0, 8)}...` : 'none'})`);
            // Check new code BEFORE update (only when activating)
            if (shouldActivate) {
                logger?.debug(`Checking new source code before update: ${programName}`);
                try {
                    await (0, adtObjectOps_1.checkSourceOrThrow)(connection, (0, adtObjectOps_1.buildActivationUri)(programName, 'PROG'), args.source_code, `program ${programName}`);
                    logger?.debug(`New code check passed: ${programName}`);
                }
                catch (checkError) {
                    if (checkError.isAlreadyChecked) {
                        logger?.debug(`Program ${programName} was already checked - continuing`);
                    }
                    else {
                        logger?.error(`New code check failed: ${programName} - ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                        throw new Error(`New code check failed: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                    }
                }
            }
            else {
                logger?.debug(`Skipping syntax check (activate=false): ${programName}`);
            }
            // Update
            logger?.debug(`Updating program source code: ${programName}`);
            await client.getProgram().update({
                programName,
                sourceCode: args.source_code,
                transportRequest: args.transport_request,
            }, { lockHandle });
            logger?.info(`Program source code updated: ${programName}`);
        }
        finally {
            if (lockHandle) {
                try {
                    logger?.debug(`Unlocking program: ${programName}`);
                    await client.getProgram().unlock({ programName }, lockHandle);
                    logger?.info(`Program unlocked: ${programName}`);
                }
                catch (unlockError) {
                    logger?.warn(`Failed to unlock program ${programName}: ${unlockError?.message || unlockError}`);
                }
            }
        }
        // Check inactive version (after unlock, only when activating)
        if (shouldActivate) {
            logger?.debug(`Checking inactive version: ${programName}`);
            try {
                await (0, utils_1.safeCheckOperation)(() => client.getProgram().check({ programName }, 'inactive'), programName, {
                    debug: (message) => logger?.debug(message),
                });
                logger?.debug(`Inactive version check completed: ${programName}`);
            }
            catch (checkError) {
                if (checkError.isAlreadyChecked) {
                    logger?.debug(`Program ${programName} was already checked - continuing`);
                }
                else {
                    logger?.warn(`Inactive version check had issues: ${programName} - ${checkError instanceof Error ? checkError.message : String(checkError)}`);
                }
            }
        }
        // Activate if requested
        if (shouldActivate) {
            logger?.debug(`Activating program: ${programName}`);
            try {
                const activateState = await client.getProgram().activate({
                    programName,
                });
                activateResponse = activateState.activateResult;
                logger?.info(`Program activated: ${programName}`);
            }
            catch (activationError) {
                logger?.error(`Activation failed: ${programName} - ${activationError instanceof Error ? activationError.message : String(activationError)}`);
                throw new Error(`Activation failed: ${activationError instanceof Error ? activationError.message : String(activationError)}`);
            }
        }
        else {
            logger?.debug(`Skipping activation for: ${programName}`);
        }
        // Evaluate SAP's ACTUAL activation result.
        //
        // The activation response used to be scraped for display-only "warnings"
        // while the reported `activated` field was a copy of the caller's own
        // `activate` request parameter — so an activation SAP REFUSED was still
        // announced as success (the dep's activate() wrapper never parses the
        // response body at all). Any error-level message now fails the call.
        const activation = shouldActivate
            ? (0, adtObjectOps_1.evaluateActivationResponse)(activateResponse)
            : undefined;
        if (activation && !activation.success) {
            throw new Error(`Program ${programName} source was updated but ACTIVATION FAILED: ` +
                `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive; ` +
                `fix the source and update again.`);
        }
        const activationWarnings = activation?.warnings.length
            ? activation.warnings.map((m) => `${m.type}: ${m.text}`)
            : [];
        logger?.info(`UpdateProgram completed successfully: ${programName}`);
        const result = {
            success: true,
            program_name: programName,
            type: 'PROG/P',
            // SAP's verdict, not the request flag.
            activated: activation ? activation.activated : false,
            message: shouldActivate
                ? `Program ${programName} source updated and activated successfully`
                : `Program ${programName} source updated successfully (not activated)`,
            uri: `/sap/bc/adt/programs/programs/${(0, utils_1.encodeSapObjectName)(programName).toLowerCase()}`,
            steps_completed: [
                'lock',
                'check_new_code',
                'update',
                'unlock',
                'check_inactive',
                ...(shouldActivate ? ['activate'] : []),
            ],
            activation_warnings: activationWarnings.length > 0 ? activationWarnings : undefined,
            source_size_bytes: args.source_code.length,
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
        // Parse error message
        let errorMessage = error instanceof Error ? error.message : String(error);
        // Attempt to parse ADT XML error
        try {
            const parser = new fast_xml_parser_1.XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
            });
            const errorData = error?.response?.data
                ? parser.parse(error.response.data)
                : null;
            const errorMsg = errorData?.['exc:exception']?.message?.['#text'] ||
                errorData?.['exc:exception']?.message;
            if (errorMsg) {
                errorMessage = `SAP Error: ${errorMsg}`;
            }
        }
        catch {
            // ignore parse errors
        }
        logger?.error(`Error updating program source ${programName}: ${errorMessage}`);
        return (0, utils_1.return_error)(new Error(`Failed to update program ${programName}: ${errorMessage}`));
    }
}
//# sourceMappingURL=handleUpdateProgram.js.map