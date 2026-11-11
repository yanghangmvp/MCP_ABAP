"use strict";
/**
 * DeleteClass Handler - Delete ABAP Class via AdtClient
 *
 * Uses AdtClient.getClass().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteClass = handleDeleteClass;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteClass',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Delete an ABAP class from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.',
    inputSchema: {
        type: 'object',
        properties: {
            class_name: {
                type: 'string',
                description: 'Class name (e.g., ZCL_MY_CLASS).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).',
            },
        },
        required: ['class_name'],
    },
};
/**
 * Main handler for DeleteClass MCP tool
 *
 * Uses AdtClient.getClass().delete() - high-level delete operation with deletion check
 */
async function handleDeleteClass(context, args) {
    const { connection, logger } = context;
    try {
        const { class_name, transport_request } = args;
        // Validation
        if (!class_name) {
            return (0, utils_1.return_error)(new Error('class_name is required'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const className = class_name.toUpperCase();
        logger?.info(`Starting class deletion: ${className}`);
        try {
            // Delete class using AdtClient (includes deletion check)
            const classObject = client.getClass();
            const deleteResult = await classObject.delete({
                className,
                transportRequest: transport_request,
            });
            if (!deleteResult || !deleteResult.deleteResult) {
                throw new Error(`Delete did not return a response for class ${className}`);
            }
            // VERIFY the deletion actually happened.
            //
            // The guard above only proves a response object came back. ADT answers
            // HTTP 200 when it REFUSES a deletion (the reason lives in the response
            // messages), and the dep's delete functions additionally overwrite the
            // response body with a hardcoded success payload — so a refused deletion
            // was reported as "deleted successfully" while the object stayed in the
            // system, and the next run failed with a misleading "already exists".
            const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, `/sap/bc/adt/oo/classes/${(0, utils_1.encodeSapObjectName)(className).toLowerCase()}`, `Class ${className}`);
            if (deletionFailure) {
                throw new Error(deletionFailure);
            }
            logger?.info(`✅ DeleteClass completed successfully: ${className}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    class_name: className,
                    transport_request: transport_request || null,
                    message: `Class ${className} deleted successfully.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error deleting class ${className}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to delete class: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Class ${className} not found. It may already be deleted.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Class ${className} is locked by another user. Cannot delete.`;
            }
            else if (error.response?.status === 400) {
                errorMessage = `Bad request. Check if transport request is required and valid.`;
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
                    // Ignore parse errors
                }
            }
            return (0, utils_1.return_error)(new Error(errorMessage));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleDeleteClass.js.map