"use strict";
/**
 * DeletePackage Handler - Delete an ABAP package (DEVC)
 *
 * The package handlers already had a working delete, but it was registered ONLY
 * in the low-level group, so a server started with `--exposition=readonly,high`
 * (the RAP lab's configuration) offered no way to delete a package at all —
 * every test round that created packages leaked them. This is the same
 * implementation exposed in the high group, with the post-delete existence
 * verification the other high `Delete*` handlers gained.
 *
 * Deletion goes through `deletePackageWithMessages` rather than the dep's
 * `getPackage().delete()`, because the dep reads `del:message` as a SINGLE
 * message and so collapses SAP's message ARRAY into a generic "Deletion
 * failed" — hiding the actionable reason (package not empty, no TADIR record,
 * locked in a transport, …).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleDeletePackage = handleDeletePackage;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const clients_1 = require("../../../lib/clients");
const packageDelete_1 = require("../../../lib/packageDelete");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'DeletePackage',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Delete. Subject: Package. Delete an ABAP package (DEVC) from the SAP system. ' +
        'The package must be EMPTY — SAP refuses to delete a package that still contains objects, ' +
        'and the refusal reason is relayed verbatim. Transport request required for transportable ' +
        'packages, optional for local ones ($*). NOTE: ADT cannot delete a package that has no ' +
        'TADIR/TDEVC record (a half-created "orphan" package); such a package needs SAP-side ' +
        'cleanup via SE21.',
    inputSchema: {
        type: 'object',
        properties: {
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZMCP_TEST).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900065). Required for transportable packages. Omit for local packages ($*).',
            },
        },
        required: ['package_name'],
    },
};
async function handleDeletePackage(context, args) {
    const { connection, logger } = context;
    try {
        const { package_name, transport_request } = args;
        if (!package_name) {
            return (0, utils_1.return_error)(new Error('package_name is required'));
        }
        const packageName = package_name.toUpperCase();
        // Wrap the connection so the sap-language pinning applies (see the P1 fix).
        (0, clients_1.createAdtClient)(connection, logger);
        logger?.info(`Starting package deletion: ${packageName}`);
        try {
            const result = await (0, packageDelete_1.deletePackageWithMessages)(connection, packageName, transport_request);
            if (!result.isDeleted) {
                const detail = result.messages.length
                    ? (0, adtMessages_1.formatAdtMessages)(result.messages)
                    : 'SAP reported the package was not deleted (no message returned).';
                return (0, utils_1.return_error)(new Error(`Failed to delete package ${packageName}: ${detail}`));
            }
            // GROUND TRUTH: ask the system whether the package is really gone.
            // `isDeleted` is SAP's own report; this checks the outcome. A package that
            // survives a "successful" deletion otherwise resurfaces later as a
            // misleading "already exists" from CreatePackage.
            const deletionFailure = await (0, adtDeletion_1.describeFailedDeletion)(connection, `/sap/bc/adt/packages/${(0, utils_1.encodeSapObjectName)(packageName).toLowerCase()}`, `Package ${packageName}`, result.messages);
            if (deletionFailure) {
                return (0, utils_1.return_error)(new Error(deletionFailure));
            }
            logger?.info(`✅ DeletePackage completed successfully: ${packageName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    package_name: packageName,
                    transport_request: transport_request || null,
                    messages: result.messages,
                    message: `Package ${packageName} deleted successfully.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error deleting package ${packageName}: ${error?.message || error}`);
            let errorMessage = `Failed to delete package ${packageName}: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Package ${packageName} not found. It may already be deleted.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Package ${packageName} is locked (an edit session or a transport lock). Clear it in SM12 or release the transport, then retry.`;
            }
            else if (error.response?.status === 400) {
                errorMessage = `Bad request deleting package ${packageName}. A transportable package needs a valid transport_request. SAP said: ${typeof error.response?.data === 'string'
                    ? error.response.data.slice(0, 500)
                    : 'no response body'}`;
            }
            return (0, utils_1.return_error)(new Error(errorMessage));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleDeletePackage.js.map