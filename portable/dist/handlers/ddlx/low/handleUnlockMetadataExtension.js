"use strict";
/**
 * UnlockMetadataExtension Handler - Unlock ABAP MetadataExtension
 *
 * Uses AdtClient.unlockMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUnlockMetadataExtension = handleUnlockMetadataExtension;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UnlockMetadataExtensionLow',
    available_in: ['onprem', 'cloud'],
    description: '[low-level] Unlock an ABAP metadata extension after modification. Requires the lock_handle from LockMetadataExtension operation.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'MetadataExtension name (e.g., ZI_MY_DDLX).',
            },
            lock_handle: {
                type: 'string',
                description: 'Lock handle from LockMetadataExtension operation.',
            },
            session_id: {
                type: 'string',
                description: 'Session ID from LockMetadataExtension operation. Must be the same as used in LockMetadataExtension.',
            },
            session_state: {
                type: 'object',
                description: 'Session state from LockMetadataExtension (cookies, csrf_token, cookie_store). Required if session_id is provided.',
                properties: {
                    cookies: { type: 'string' },
                    csrf_token: { type: 'string' },
                    cookie_store: { type: 'object' },
                },
            },
        },
        required: ['name', 'lock_handle'],
    },
};
/**
 * Main handler for UnlockMetadataExtension MCP tool
 *
 * Uses AdtClient.unlockMetadataExtension - low-level single method call
 */
async function handleUnlockMetadataExtension(context, args) {
    const { connection, logger } = context;
    try {
        const { name, lock_handle, session_id, session_state } = args;
        // Validation
        if (!name || !lock_handle) {
            return (0, utils_1.return_error)(new Error('name and lock_handle are required'));
        }
        // session_id is NOT required to unlock — the unlock call needs only the
        // object name and the lock handle. Demanding it used to REFUSE the
        // unlock and leak the SAP edit lock, which then surfaced much later as
        // "User <X> is currently editing <object>" on an unrelated run. It is
        // only needed to restore a captured session state.
        if (session_state && !session_id) {
            return (0, utils_1.return_error)(new Error('session_id is required when session_state is provided'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        // Restore session state if provided
        if (session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        const ddlxName = name.toUpperCase();
        logger?.info(`Starting metadata extension unlock: ${ddlxName} (session: ${(session_id || 'none').substring(0, 8)}...)`);
        try {
            // Unlock metadata extension
            const unlockState = await client
                .getMetadataExtension()
                .unlock({ name: ddlxName }, lock_handle);
            const unlockResult = unlockState.unlockResult;
            if (!unlockResult) {
                throw new Error(`Unlock did not return a response for metadata extension ${ddlxName}`);
            }
            // Get updated session state after unlock
            logger?.info(`✅ UnlockMetadataExtension completed: ${ddlxName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    name: ddlxName,
                    session_id: session_id,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: `MetadataExtension ${ddlxName} unlocked successfully.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error unlocking metadata extension ${ddlxName}: ${error?.message || error}`);
            // Parse error message
            let errorMessage = `Failed to unlock metadata extension: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `MetadataExtension ${ddlxName} not found.`;
            }
            else if (error.response?.status === 400) {
                errorMessage = `Invalid lock handle or session. Make sure you're using the same session_id and lock_handle from LockMetadataExtension.`;
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
//# sourceMappingURL=handleUnlockMetadataExtension.js.map