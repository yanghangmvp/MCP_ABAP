"use strict";
/**
 * UpdateFunctionModule Handler - Update Existing ABAP Function Module Source Code
 *
 * Uses FunctionModuleBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> lock -> update -> check -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateFunctionModule = handleUpdateFunctionModule;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateFunctionModule',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Update, Create. Subject: FunctionModule. Will be useful for updating or creating function module. Update source code of an existing ABAP function module. Locks, updates, unlocks, and optionally activates.',
    inputSchema: {
        type: 'object',
        properties: {
            function_group_name: {
                type: 'string',
                description: 'Function group name containing the function module (e.g., ZOK_FG_MCP01).',
            },
            function_module_name: {
                type: 'string',
                description: 'Function module name (e.g., Z_TEST_FM_MCP01). Function module must already exist.',
            },
            source_code: {
                type: 'string',
                description: 'Complete ABAP function module source code. Must include FUNCTION statement with parameters and ENDFUNCTION. Example:\n\nFUNCTION Z_TEST_FM\n  IMPORTING\n    VALUE(iv_input) TYPE string\n  EXPORTING\n    VALUE(ev_output) TYPE string.\n  \n  ev_output = iv_input.\nENDFUNCTION.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable function modules.',
            },
            activate: {
                type: 'boolean',
                description: "Activate after the update. DEFAULT: FALSE — omitting it leaves the object INACTIVE, so pass true explicitly if you want it usable. (Update* tools are not consistent on this default: DDIC tools such as UpdateTable / UpdateStructure default to true.) The activated field in the response is SAP's own verdict, not a copy of this parameter.",
            },
        },
        required: ['function_group_name', 'function_module_name', 'source_code'],
    },
};
/**
 * Main handler for UpdateFunctionModule MCP tool
 *
 * Uses FunctionModuleBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleUpdateFunctionModule(context, args) {
    const { connection, logger } = context;
    try {
        // Validate inputs
        if (!args.function_module_name || args.function_module_name.length > 30) {
            return (0, utils_1.return_error)(new Error('Function module name is required and must not exceed 30 characters'));
        }
        if (!args.function_group_name || args.function_group_name.length > 30) {
            return (0, utils_1.return_error)(new Error('Function group name is required and must not exceed 30 characters'));
        }
        if (!args.source_code) {
            return (0, utils_1.return_error)(new Error('Source code is required'));
        }
        // Get connection from session context (set by ProtocolHandler)
        // Connection is managed and cached per session, with proper token refresh via AuthBroker
        const functionGroupName = args.function_group_name.toUpperCase();
        const functionModuleName = args.function_module_name.toUpperCase();
        logger?.info(`Starting function module source update: ${functionModuleName} in ${functionGroupName}`);
        try {
            const client = (0, clients_1.createAdtClient)(connection, logger);
            const shouldActivate = args.activate === true;
            // Execute operation chain: lock -> update -> check -> unlock -> (activate)
            let lockHandle;
            try {
                lockHandle = await client.getFunctionModule().lock({
                    functionModuleName,
                    functionGroupName,
                });
                await client.getFunctionModule().update({
                    functionModuleName,
                    functionGroupName,
                    sourceCode: args.source_code,
                    transportRequest: args.transport_request,
                }, { lockHandle });
                await client.getFunctionModule().check({
                    functionModuleName,
                    functionGroupName,
                });
            }
            finally {
                // Always unlock if we got a lock handle
                if (lockHandle) {
                    try {
                        await client
                            .getFunctionModule()
                            .unlock({ functionModuleName, functionGroupName }, lockHandle);
                    }
                    catch (unlockError) {
                        logger?.warn(`Failed to unlock function module ${functionModuleName}: ${unlockError?.message || unlockError}`);
                    }
                }
            }
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getFunctionModule()
                    .read({ functionModuleName, functionGroupName }, 'inactive', {
                    withLongPolling: true,
                });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            let activation;
            // Activate if requested (after unlock) — and check what SAP actually did.
            // The response used to be discarded and the result reported
            // `activated: shouldActivate`, i.e. the caller's own request flag, so a
            // refused activation looked successful.
            if (shouldActivate) {
                activation = (0, adtObjectOps_1.evaluateActivationResponse)(await client.getFunctionModule().activate({
                    functionModuleName,
                    functionGroupName,
                }));
            }
            if (activation && !activation.success) {
                throw new Error(`Function module ${functionModuleName} was written but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive.`);
            }
            logger?.info(`✅ UpdateFunctionModule completed successfully: ${functionModuleName}`);
            const result = {
                success: true,
                function_module_name: functionModuleName,
                function_group_name: functionGroupName,
                transport_request: args.transport_request || null,
                // SAP's verdict, not the request flag.
                activated: activation ? activation.activated : false,
                message: `Function module ${functionModuleName} source code updated successfully${shouldActivate ? ' and activated' : ''}`,
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
            logger?.error(`Error updating function module source ${functionModuleName}: ${error?.message || error}`);
            let errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            if (error.response?.status === 404) {
                errorMessage = `Function module ${functionModuleName} not found in group ${functionGroupName}.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Function module ${functionModuleName} is locked by another user or lock handle is invalid.`;
            }
            else if (error.response?.status === 400) {
                // A 400 here used to be reported as "the object may be assigned to a
                // transport request. Pass transport_request explicitly." — a guess that
                // ALSO discarded the ADT body. The real cause is very often the source
                // itself, and `*"` in particular: in a function module `*"` opens the
                // SIGNATURE DECLARATION area that SE37 maintains, not a free comment,
                // so free text on a `*"` line makes SAP reject the whole source update.
                // (Bisected live: identical source with the 13 `*\"` lines changed to
                // `*` was accepted immediately.) Lead with that hint, keep SAP's own
                // body, and only mention the transport when one was really absent.
                const hints = [];
                if (/^\s*\*"/m.test(args.source_code || '')) {
                    hints.push('The source contains `*"` lines. In a function module `*"` delimits the ' +
                        'signature declaration area (maintained by SE37), NOT a free-text comment — ' +
                        'free text on such a line makes SAP reject the entire source update. Use `*` ' +
                        'for ordinary comments and keep `*"` only for the generated signature block.');
                }
                if (!args.transport_request) {
                    hints.push('If the object is in a transportable package, pass transport_request explicitly.');
                }
                errorMessage = [
                    `Update failed for ${functionModuleName} (HTTP 400).`,
                    ...hints,
                    errorMessage
                        ? `ADT response: ${String(errorMessage).slice(0, 1200)}`
                        : '',
                ]
                    .filter(Boolean)
                    .join(' ');
            }
            else if (error.response?.data &&
                typeof error.response.data === 'string') {
                try {
                    const { XMLParser } = require('fast-xml-parser');
                    const parser = new XMLParser({
                        ignoreAttributes: false,
                        attributeNamePrefix: '@_',
                    });
                    const errorData = parser.parse(error.response.data);
                    const errorMsg = errorData['exc:exception']?.message?.['#text'] ||
                        errorData['exc:exception']?.message;
                    if (errorMsg) {
                        errorMessage = `SAP Error: ${errorMsg}`;
                    }
                }
                catch (_parseError) {
                    // Keep original error message if XML parsing fails
                }
            }
            return (0, utils_1.return_error)(new Error(`Failed to update function module source: ${errorMessage}`));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateFunctionModule.js.map