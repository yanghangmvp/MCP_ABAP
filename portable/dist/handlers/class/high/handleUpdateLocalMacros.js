"use strict";
/**
 * UpdateLocalMacros Handler - Update Local Macros via AdtClient
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateLocalMacros = handleUpdateLocalMacros;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateLocalMacros',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Update local macros in an ABAP class (macros include). Manages lock, check, update, unlock, and optional activation. Note: Macros are supported in older ABAP versions but not in newer ones.',
    inputSchema: {
        type: 'object',
        properties: {
            class_name: {
                type: 'string',
                description: 'Parent class name (e.g., ZCL_MY_CLASS).',
            },
            macros_code: {
                type: 'string',
                description: 'Updated source code for local macros.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number.',
            },
            activate_on_update: {
                type: 'boolean',
                description: 'Activate parent class after updating. Default: false',
                default: false,
            },
        },
        required: ['class_name', 'macros_code'],
    },
};
async function handleUpdateLocalMacros(context, args) {
    const { connection, logger } = context;
    try {
        const { class_name, macros_code, transport_request, activate_on_update = false, } = args;
        if (!class_name || !macros_code) {
            return (0, utils_1.return_error)(new Error('class_name and macros_code are required'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const className = class_name.toUpperCase();
        logger?.info(`Updating local macros for ${className}`);
        try {
            const localMacros = client.getLocalMacros();
            const updateResult = await localMacros.update({
                className,
                macrosCode: macros_code,
                transportRequest: transport_request,
            }, { activateOnUpdate: activate_on_update });
            if (!updateResult) {
                throw new Error(`Update did not return a result for ${className}`);
            }
            // The dep activates INSIDE update() when activateOnUpdate is set and never
            // exposes the outcome, so `activated` used to be a copy of the request flag.
            // Re-run the activation through our own parser to get SAP's real verdict:
            // already-active answers activated:false with no messages (a harmless
            // no-op), whereas a refused activation surfaces its error messages here.
            const activation = activate_on_update
                ? await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
                    { name: className, type: 'CLAS/OC' },
                ])
                : undefined;
            if (activation && !activation.success) {
                throw new Error(`The local macros of ${className} were updated but ACTIVATION FAILED: ` +
                    `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The class is left inactive.`);
            }
            logger?.info(`✅ UpdateLocalMacros completed successfully: ${className}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    class_name: className,
                    transport_request: transport_request || null,
                    // SAP's verdict, not the request flag.
                    activated: activation ? activation.activated : false,
                    message: `Local macros updated successfully in ${className}.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error updating local macros for ${className}: ${error?.message || error}`);
            const detailedError = (0, utils_1.extractAdtErrorMessage)(error, `Failed to update local macros in ${className}`);
            let errorMessage = `Failed to update local macros: ${detailedError}`;
            if (error.response?.status === 404) {
                errorMessage = `Local macros for ${className} not found.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Class ${className} is locked by another user.`;
            }
            return (0, utils_1.return_error)(new Error(errorMessage));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleUpdateLocalMacros.js.map