"use strict";
/**
 * UpdateDomain Handler - Update ABAP Domain Properties
 *
 * Uses AdtClient.updateDomain from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateDomain = handleUpdateDomain;
const domainXml_1 = require("../../../lib/domainXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateDomainLow',
    available_in: ['onprem', 'cloud'],
    description: '[low-level] Update properties of an existing ABAP domain. Requires lock handle from LockObject. - use UpdateDomain (high-level) for full workflow with lock/unlock/activate.',
    inputSchema: {
        type: 'object',
        properties: {
            domain_name: {
                type: 'string',
                description: 'Domain name (e.g., ZOK_D_TEST_0001). Domain must already exist.',
            },
            properties: {
                type: 'object',
                description: 'Domain properties object. Can include: description, datatype, length, decimals, conversion_exit, lowercase, sign_exists, value_table, fixed_values, etc.',
            },
            lock_handle: {
                type: 'string',
                description: 'Lock handle from LockObject. Required for update operation.',
            },
            session_id: {
                type: 'string',
                description: 'Session ID from GetSession. If not provided, a new session will be created.',
            },
            session_state: {
                type: 'object',
                description: 'Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.',
                properties: {
                    cookies: { type: 'string' },
                    csrf_token: { type: 'string' },
                    cookie_store: { type: 'object' },
                },
            },
        },
        required: ['domain_name', 'properties', 'lock_handle'],
    },
};
/**
 * Main handler for UpdateDomain MCP tool
 *
 * Uses AdtClient.updateDomain - low-level single method call
 */
async function handleUpdateDomain(context, args) {
    const { connection, logger } = context;
    try {
        const { domain_name, properties, lock_handle, session_id, session_state } = args;
        // Validation
        if (!domain_name || !properties || !lock_handle) {
            return (0, utils_1.return_error)(new Error('domain_name, properties, and lock_handle are required'));
        }
        const domainName = domain_name.toUpperCase();
        logger?.info(`Starting domain update: ${domainName}`);
        // Restore session state if provided
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        try {
            // Write the requested properties via read-modify-write.
            //
            // The previous implementation forwarded ONLY description to the builder
            // update and dropped datatype/length/decimals/etc. entirely; the builder
            // itself could also not insert a missing <doma:content> subtree. Both are
            // fixed by writeDomainContent, which maps every provided property and
            // inserts missing nodes. Only fields actually present are touched.
            const updateResult = await (0, domainXml_1.writeDomainContent)(connection, domainName, {
                description: properties.description,
                datatype: properties.datatype ?? properties.dataType,
                length: properties.length,
                decimals: properties.decimals,
                conversion_exit: properties.conversion_exit ?? properties.conversionExit,
                lowercase: properties.lowercase,
                sign_exists: properties.sign_exists ?? properties.signExists,
                value_table: properties.value_table ?? properties.valueTable,
                fixed_values: properties.fixed_values ?? properties.fixedValues,
            }, lock_handle, properties.transport_request ?? properties.transportRequest);
            if (!updateResult) {
                throw new Error(`Update did not return a response for domain ${domainName}`);
            }
            // Get updated session state after update
            logger?.info(`✅ UpdateDomain completed: ${domainName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    domain_name: domainName,
                    session_id: session_id || null,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: `Domain ${domainName} updated successfully. Remember to unlock using UnlockObject.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error updating domain ${domainName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to update domain: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Domain ${domainName} not found.`;
            }
            else if (error.response?.status === 423) {
                errorMessage = `Domain ${domainName} is locked by another user or lock handle is invalid.`;
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
//# sourceMappingURL=handleUpdateDomain.js.map