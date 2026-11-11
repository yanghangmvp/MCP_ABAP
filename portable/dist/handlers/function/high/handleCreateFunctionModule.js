"use strict";
/**
 * CreateFunctionModule Handler - ABAP Function Module Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * Source code is set via UpdateFunctionModule handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateFunctionModule = handleCreateFunctionModule;
const clients_1 = require("../../../lib/clients");
const functionModuleCreate_1 = require("../../../lib/functionModuleCreate");
const systemContext_1 = require("../../../lib/systemContext");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CreateFunctionModule',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Create. Subject: FunctionModule. Will be useful for creating function module. Create a new ABAP function module within an existing function group. Creates the function module in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            function_group_name: {
                type: 'string',
                description: 'Parent function group name (e.g., ZTEST_FG_001)',
            },
            function_module_name: {
                type: 'string',
                description: 'Function module name (e.g., Z_TEST_FUNCTION_001). Must follow SAP naming conventions (start with Z or Y, max 30 chars).',
            },
            description: {
                type: 'string',
                description: 'Optional description for the function module',
            },
            processing_type: {
                type: 'string',
                description: 'SE37 "Processing Type". Defaults to "normal". ' +
                    '"remote" = Remote-Enabled (RFC) module. ' +
                    '"update_start_immediate" = V1 update module (TFDIR-UTASK 1) — the kind called with ' +
                    'CALL FUNCTION ... IN UPDATE TASK, whose failure makes COMMIT WORK AND WAIT report ' +
                    'sy-subrc <> 0. "update_start_delayed" = V2 (UTASK 2). ' +
                    '"update_immediate_no_restart" = immediate start without restart (UTASK 3). ' +
                    'The created module is read back and the response reports the processing type SAP ' +
                    'actually stored, so a silently ignored value shows up as a failure.',
                enum: [
                    'normal',
                    'remote',
                    'update_start_immediate',
                    'update_start_delayed',
                    'update_immediate_no_restart',
                ],
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
        },
        required: ['function_group_name', 'function_module_name'],
    },
};
/**
 * Main handler for CreateFunctionModule MCP tool
 */
async function handleCreateFunctionModule(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.function_group_name) {
            return (0, utils_1.return_error)(new Error('function_group_name is required'));
        }
        if (!args?.function_module_name) {
            return (0, utils_1.return_error)(new Error('function_module_name is required'));
        }
        const functionGroupName = args.function_group_name.toUpperCase();
        const functionModuleName = args.function_module_name.toUpperCase();
        (0, utils_1.assertNameLength)('function_module', functionModuleName, 'Function module');
        logger?.info(`Starting function module creation: ${functionModuleName} in ${functionGroupName}`);
        try {
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Validate — fail fast BEFORE create if the name is taken.
            await (0, utils_1.assertObjectDoesNotExist)(`Function module ${functionModuleName}`, () => client.getFunctionModule().validate({
                functionModuleName,
                functionGroupName,
                packageName: '',
                description: args.description || functionModuleName,
            }), connection);
            // Create.
            //
            // Goes through the in-repo builder rather than the dep's create(), which
            // emits no processing-type attributes at all (so every module it made was
            // a plain NORMAL one) and interpolates the description unescaped. Package
            // name is inherited from the parent function group either way.
            const sysContext = (0, systemContext_1.getSystemContext)();
            await (0, functionModuleCreate_1.createFunctionModuleDirect)(connection, {
                functionModuleName,
                functionGroupName,
                description: args.description || functionModuleName,
                processingType: args.processing_type,
                masterSystem: sysContext.masterSystem,
                responsible: sysContext.responsible,
                transportRequest: args.transport_request,
            });
            logger?.info(`Function module created: ${functionModuleName}`);
            // SAP ignores the processing-type attributes on the create POST (verified
            // live: the body carries them, the response is 200, and the module reads
            // back as "normal"). So apply them as a separate metadata write, the same
            // read-modify-write SE37 performs when the radio button is changed.
            if (args.processing_type && args.processing_type !== 'normal') {
                await (0, functionModuleCreate_1.setFunctionModuleProcessingType)(connection, functionGroupName, functionModuleName, args.processing_type, args.transport_request);
            }
            // VERIFY rather than report the request back. The processing type is a
            // runtime behaviour: claiming "created as a V1 update module" without
            // checking is exactly how a test ends up asserting against a normal
            // module and drawing the wrong conclusion.
            const want = (0, functionModuleCreate_1.expectedProcessing)(args.processing_type);
            let stored = {
                processing_type: null,
                update_task_kind: null,
            };
            let verifyNote;
            try {
                const read = await (0, utils_1.makeAdtRequestWithTimeout)(connection, (0, functionModuleCreate_1.functionModuleUri)(functionGroupName, functionModuleName), 'GET');
                stored = (0, functionModuleCreate_1.parseFunctionModuleProcessing)(String(read?.data ?? ''));
            }
            catch (readError) {
                verifyNote = `Could not read the module back to confirm its processing type: ${readError?.message || readError}`;
            }
            // A module created without an explicit processing_type reports whatever
            // SAP defaulted to; only an EXPLICIT request is held to account.
            const mismatch = args.processing_type &&
                !verifyNote &&
                (stored.processing_type !== want.processingType ||
                    (want.updateTaskKind ?? null) !== stored.update_task_kind);
            if (mismatch) {
                return (0, utils_1.return_error)(new Error(`Function module ${functionModuleName} was created, but SAP stored ` +
                    `processingType="${stored.processing_type}" ` +
                    `updateTaskKind="${stored.update_task_kind}" instead of the requested ` +
                    `"${want.processingType}"/"${want.updateTaskKind ?? '(none)'}" ` +
                    `(processing_type: ${args.processing_type}). The module exists — ` +
                    'delete it with DeleteFunctionModule, or set the processing type in SE37.'));
            }
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    function_module_name: functionModuleName,
                    function_group_name: functionGroupName,
                    requested_processing_type: args.processing_type || 'normal',
                    // Read from ADT after the create, not echoed from the request.
                    processing_type: stored.processing_type,
                    update_task_kind: stored.update_task_kind,
                    transport_request: args.transport_request || 'local',
                    ...(verifyNote ? { warning: verifyNote } : {}),
                    message: `Function module ${functionModuleName} created successfully. ` +
                        'Use UpdateFunctionModule to set source code.' +
                        (args.processing_type && args.processing_type !== 'normal'
                            ? ' NOTE: the processing type is stored in ADT now but only reaches ' +
                                'TFDIR-UTASK when the module is ACTIVATED, so activate it before ' +
                                'relying on the runtime behaviour.'
                            : ''),
                }),
            });
        }
        catch (error) {
            logger?.error(`Error creating function module ${functionModuleName}: ${error?.message || error}`);
            // Check if function module already exists
            if (error.message?.includes('already exists') ||
                error.response?.status === 409) {
                return (0, utils_1.return_error)(new Error(`Function module ${functionModuleName} already exists in group ${functionGroupName}. Please delete it first or use a different name.`));
            }
            if (error.response?.status === 404) {
                return (0, utils_1.return_error)(new Error(`Function group ${functionGroupName} not found. Create the function group first.`));
            }
            if (error.response?.status === 400) {
                return (0, utils_1.return_error)(new Error(`Bad request. Check if function module name is valid and function group exists.`));
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            return (0, utils_1.return_error)(new Error(`Failed to create function module ${functionModuleName}: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateFunctionModule.js.map