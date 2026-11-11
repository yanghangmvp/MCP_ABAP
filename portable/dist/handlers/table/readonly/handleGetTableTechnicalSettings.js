"use strict";
/**
 * GetTableTechnicalSettings — read a table's SE13 settings (buffering, size
 * category, data class, logging).
 *
 * There was previously no way to see this through the MCP: the settings object
 * is not part of the table's own payload, and DD09L's SPEICHKLA column is not
 * exposed by the ADT Data Preview. The response therefore also reports the
 * DD09L-PUFFERUNG value the state corresponds to, so the caller can cross-check
 * it with `SELECT tabname, pufferung FROM dd09l` (that read does work).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetTableTechnicalSettings = handleGetTableTechnicalSettings;
const clients_1 = require("../../../lib/clients");
const tableSettingsXml_1 = require("../../../lib/tableSettingsXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetTableTechnicalSettings',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Operation: Read. Subject: Table technical settings (SE13). Report a table’s ' +
        'buffering mode, size category, data class and change-logging flag. ' +
        'Buffering is encoded by SAP as two fields, so "allowed" alone does NOT mean the table is ' +
        'buffered — the response states the effective mode in plain words and gives the ' +
        'DD09L-PUFFERUNG value it corresponds to for an independent check.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., ZMY_TABLE).',
            },
            version: {
                type: 'string',
                description: 'Version to read: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
        },
        required: ['table_name'],
    },
};
async function handleGetTableTechnicalSettings(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const tableName = args.table_name.toUpperCase();
        const uri = (0, tableSettingsXml_1.tableSettingsUri)(tableName);
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET', 'default', undefined, { version: args.version || 'active' }, { Accept: tableSettingsXml_1.CT_TABLE_SETTINGS });
        const settings = (0, tableSettingsXml_1.parseTableSettings)(String(response?.data ?? ''));
        // A pending INACTIVE version is invisible in the active read but decides
        // what happens on the next activation — an unactivatable inactive setting
        // makes every later activation of the table (and of its indexes) fail with
        // a message about buffering, which reads like an unrelated defect. So say so.
        const warnings = [];
        if ((args.version || 'active') === 'active') {
            try {
                const inactive = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET', 'default', undefined, { version: 'inactive' }, { Accept: tableSettingsXml_1.CT_TABLE_SETTINGS });
                const pending = (0, tableSettingsXml_1.parseTableSettings)(String(inactive?.data ?? ''));
                if (pending.version === 'inactive' &&
                    (pending.buffering !== settings.buffering ||
                        pending.size_category !== settings.size_category ||
                        pending.data_class !== settings.data_class ||
                        pending.logging_enabled !== settings.logging_enabled)) {
                    warnings.push('An INACTIVE version of these settings is pending and differs from the active ' +
                        `one (${(0, tableSettingsXml_1.describeBuffering)(pending)}, size category ${pending.size_category}, ` +
                        `data class ${pending.data_class}, logging ${pending.logging_enabled ? 'on' : 'off'}). It is what the next activation of this table will apply.`);
                }
            }
            catch {
                // No inactive version, or the version parameter is not honoured here.
                // Either way it is not worth failing the read for.
            }
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                ...settings,
                table_name: settings.table_name || tableName,
                buffering_description: (0, tableSettingsXml_1.describeBuffering)(settings),
                ...(warnings.length ? { warnings } : {}),
                verify_with: `SELECT tabname, pufferung FROM dd09l WHERE tabname = '${tableName}'`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const body = error?.response?.data
            ? typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
            : '';
        let message = `Error reading technical settings for ${args?.table_name}: ${error instanceof Error ? error.message : String(error)}`;
        if (error?.response?.status === 404) {
            message =
                `Table ${args?.table_name?.toUpperCase()} has no technical settings object. ` +
                    'Only transparent DDIC tables have one — a structure, an append or a view does not.';
        }
        else if (body) {
            message += ` | ADT: ${body.slice(0, 800)}`;
        }
        logger?.error(message);
        return (0, utils_1.return_error)(new Error(message));
    }
}
//# sourceMappingURL=handleGetTableTechnicalSettings.js.map