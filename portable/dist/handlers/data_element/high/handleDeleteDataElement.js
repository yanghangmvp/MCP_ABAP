"use strict";
/**
 * DeleteDataElement Handler - Delete ABAP Data Element via AdtClient
 *
 * Uses AdtClient.getDataElement().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeleteDataElement = handleDeleteDataElement;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeleteDataElement',
    available_in: ['onprem', 'cloud'],
    description: 'Delete an ABAP data element from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.',
    inputSchema: {
        type: 'object',
        properties: {
            data_element_name: {
                type: 'string',
                description: 'Data element name (e.g., Z_MY_DATA_ELEMENT).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).',
            },
        },
        required: ['data_element_name'],
    },
};
/**
 * Main handler for DeleteDataElement MCP tool
 *
 * Uses AdtClient.getDataElement().delete() - high-level delete operation with deletion check
 */
async function handleDeleteDataElement(context, args) {
    const { connection, logger } = context;
    try {
        const { data_element_name, transport_request } = args;
        // Validation
        if (!data_element_name) {
            return (0, utils_1.return_error)(new Error('data_element_name is required'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const dataElementName = data_element_name.toUpperCase();
        logger?.info(`Starting data element deletion: ${dataElementName}`);
        try {
            // Delete data element using AdtClient (includes deletion check)
            const dataElementObject = client.getDataElement();
            const deleteResult = await dataElementObject.delete({
                dataElementName,
                transportRequest: transport_request,
            });
            if (!deleteResult || !deleteResult.deleteResult) {
                throw new Error(`Delete did not return a response for data element ${dataElementName}`);
            }
            // VERIFY the deletion actually happened.
            //
            // The guard above only proves a response object came back. ADT answers
            // HTTP 200 when it REFUSES a deletion (the reason lives in the response
            // messages), and the dep's delete functions additionally overwrite the
            // response body with a hardcoded success payload — so a refused deletion
            // was reported as "deleted successfully" while the object stayed in the
            // system, and the next run failed with a misleading "already exists".
            const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, `/sap/bc/adt/ddic/dataelements/${(0, utils_1.encodeSapObjectName)(dataElementName).toLowerCase()}`, `Data element ${dataElementName}`);
            if (deletionFailure) {
                throw new Error(deletionFailure);
            }
            logger?.info(`✅ DeleteDataElement completed successfully: ${dataElementName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    data_element_name: dataElementName,
                    transport_request: transport_request || null,
                    message: `Data element ${dataElementName} deleted successfully.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error deleting data element ${dataElementName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to delete data element: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Data element ${dataElementName} not found. It may already be deleted.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Data element ${dataElementName} is locked by another user. Cannot delete.`;
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
//# sourceMappingURL=handleDeleteDataElement.js.map