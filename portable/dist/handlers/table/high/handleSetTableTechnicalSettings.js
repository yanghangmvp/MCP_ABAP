"use strict";
/**
 * SetTableTechnicalSettings — change a table's SE13 settings.
 *
 * Read-modify-write: only the fields the caller passes are changed, and the
 * response reports the state read back FROM SAP afterwards rather than echoing
 * the request. Omitting a field means keep it, never reset it — a table quietly
 * losing its data class or size category is the kind of change nobody notices
 * until something behaves oddly months later.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleSetTableTechnicalSettings = handleSetTableTechnicalSettings;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const tableIndexXml_1 = require("../../../lib/tableIndexXml");
const tableSettingsXml_1 = require("../../../lib/tableSettingsXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'SetTableTechnicalSettings',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update. Subject: Table technical settings (SE13). Set a table’s buffering mode, ' +
        'size category, data class or change-logging flag. Only the fields you pass are changed; ' +
        'everything else is preserved. The settings are read back afterwards and the response ' +
        'reports what SAP actually stored. ' +
        'A buffering restriction (e.g. a table with a LOB column) is reported as a WARNING, not a ' +
        'failure, matching what SE13 does.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., ZMY_TABLE).',
            },
            buffering: {
                type: 'string',
                description: 'Buffering mode. SAP encodes this as two fields, so this single value sets both: ' +
                    '"not_allowed" (buffering forbidden), ' +
                    '"allowed_but_switched_off" (permitted but the table is NOT buffered), ' +
                    '"fully_buffered" (DD09L-PUFFERUNG X), "single_record" (P), "generic" (G). ' +
                    'For "generic" also pass generic_key_fields.',
                enum: [
                    'not_allowed',
                    'allowed_but_switched_off',
                    'fully_buffered',
                    'single_record',
                    'generic',
                ],
            },
            generic_key_fields: {
                type: 'number',
                description: 'Number of leading key fields forming the generic buffering area. Only meaningful ' +
                    'with buffering="generic"; it is forced to 0 for every other mode.',
            },
            size_category: {
                type: 'number',
                description: 'SE13 size category (0-4+): the expected space requirement of the table.',
            },
            data_class: {
                type: 'string',
                description: 'Data class / tablespace category (DD09L-TABART), e.g. APPL0 (master data), ' +
                    'APPL1 (transaction data), APPL2 (customizing).',
            },
            log_changes: {
                type: 'boolean',
                description: 'Whether table changes are logged (DD09L-PROTOKOLL). Logging also requires the ' +
                    'system parameter rec/client to be set.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required when the table is in a transportable package.',
            },
        },
        required: ['table_name'],
    },
};
async function handleSetTableTechnicalSettings(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        const hasChange = args.buffering !== undefined ||
            args.generic_key_fields !== undefined ||
            args.size_category !== undefined ||
            args.data_class !== undefined ||
            args.log_changes !== undefined;
        if (!hasChange) {
            return (0, utils_1.return_error)(new Error('Nothing to change. Pass at least one of buffering, generic_key_fields, ' +
                'size_category, data_class or log_changes. Use GetTableTechnicalSettings to read.'));
        }
        if (args.buffering === 'generic' && !args.generic_key_fields) {
            return (0, utils_1.return_error)(new Error('buffering="generic" needs generic_key_fields (how many leading key fields form ' +
                'the buffering area). Generic buffering on 0 key fields is equivalent to full ' +
                'buffering and SAP will reject or silently reinterpret it.'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const tableName = args.table_name.toUpperCase();
        const uri = (0, tableSettingsXml_1.tableSettingsUri)(tableName);
        const before = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET', 'default', undefined, undefined, { Accept: tableSettingsXml_1.CT_TABLE_SETTINGS });
        const currentXml = String(before?.data ?? '');
        if (!currentXml.includes('<ts:tableSettings')) {
            return (0, utils_1.return_error)(new Error(`Could not read the technical settings of ${tableName}; the response was not a ` +
                'tableSettings document. Only transparent DDIC tables have one.'));
        }
        const patched = (0, tableSettingsXml_1.patchTableSettings)(currentXml, {
            buffering: args.buffering,
            generic_key_fields: args.generic_key_fields,
            size_category: args.size_category,
            data_class: args.data_class,
            log_changes: args.log_changes,
        });
        if (patched === currentXml) {
            logger?.warn(`Technical settings of ${tableName} are already in the requested state`);
        }
        // Messages SAP attaches to the write (e.g. a buffering restriction because
        // the table has a LOB column). Those are warnings in SE13 too, so they must
        // not be reported as a failure.
        let writeBody = '';
        await (0, adtObjectOps_1.runLocked)(connection, uri, async (lockHandle) => {
            const params = { lockHandle };
            if (args.transport_request)
                params.corrNr = args.transport_request;
            const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'PUT', 'default', patched, params, { 'Content-Type': tableSettingsXml_1.CT_TABLE_SETTINGS });
            writeBody = String(response?.data ?? '');
        });
        // ACTIVATE. Without this the write leaves the settings object INACTIVE and
        // the table unchanged at runtime — and worse, a setting SAP will refuse
        // (e.g. generic buffering on as many key fields as the table has) is only
        // rejected at activation time, so skipping it hands back "success" for a
        // table that can no longer be activated at all. Measured on DM2/310.
        let activationError;
        try {
            const outcome = (0, adtMessages_1.evaluateActivation)(await (0, adtObjectOps_1.activateAdtObjects)(connection, [
                { uri: (0, tableIndexXml_1.tableUri)(tableName), name: tableName, type: 'TABL/DT' },
            ]));
            if (!outcome.success) {
                activationError = (0, adtMessages_1.formatAdtMessages)(outcome.errors);
            }
        }
        catch (e) {
            activationError = String(e?.message || e);
        }
        // VERIFY: report the state SAP holds, not the state we asked for.
        const after = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET', 'default', undefined, undefined, { Accept: tableSettingsXml_1.CT_TABLE_SETTINGS });
        const settings = (0, tableSettingsXml_1.parseTableSettings)(String(after?.data ?? ''));
        if (activationError) {
            // Roll the settings back so the caller is not left with a table that
            // cannot be activated. This is the difference between a rejected change
            // and a broken table.
            let rollback = 'The previous settings were restored.';
            try {
                await (0, adtObjectOps_1.runLocked)(connection, uri, async (lockHandle) => {
                    const params = { lockHandle };
                    if (args.transport_request)
                        params.corrNr = args.transport_request;
                    await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'PUT', 'default', currentXml, params, { 'Content-Type': tableSettingsXml_1.CT_TABLE_SETTINGS });
                });
                await (0, adtObjectOps_1.activateAdtObjects)(connection, [
                    { uri: (0, tableIndexXml_1.tableUri)(tableName), name: tableName, type: 'TABL/DT' },
                ]).catch(() => undefined);
            }
            catch (rollbackError) {
                rollback = `The previous settings could NOT be restored (${rollbackError?.message || rollbackError}) — table ${tableName} is left INACTIVE and must be fixed in SE13.`;
            }
            return (0, utils_1.return_error)(new Error(`Technical settings of ${tableName} were written but the table could not be ` +
                `activated: ${activationError}. ${rollback}`));
        }
        const warnings = [];
        const restriction = /<[^>]*message[^>]*>([\s\S]*?)<\/[^>]*message[^>]*>/gi;
        for (const m of writeBody.matchAll(restriction)) {
            const text = m[1].replace(/<[^>]+>/g, '').trim();
            if (text)
                warnings.push(text);
        }
        if (args.buffering && settings.buffering !== args.buffering) {
            warnings.push(`Requested buffering "${args.buffering}" but SAP stored ` +
                `"${settings.buffering}" (allowed="${settings.buffering_allowed}", ` +
                `type="${settings.buffering_type}"). The table may not permit that mode.`);
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                ...settings,
                table_name: settings.table_name || tableName,
                buffering_description: (0, tableSettingsXml_1.describeBuffering)(settings),
                ...(warnings.length ? { warnings } : {}),
                verify_with: `SELECT tabname, pufferung, protokoll FROM dd09l WHERE tabname = '${tableName}'`,
                message: `Technical settings of ${tableName} updated: ` +
                    `${(0, tableSettingsXml_1.describeBuffering)(settings)}, size category ${settings.size_category}, ` +
                    `data class ${settings.data_class}, logging ${settings.logging_enabled ? 'on' : 'off'}.`,
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
        let message = `Failed to set technical settings for ${args?.table_name}: ${error instanceof Error ? error.message : String(error)}`;
        if (body)
            message += ` | ADT: ${body.slice(0, 1000)}`;
        logger?.error(message);
        return (0, utils_1.return_error)(new Error(message));
    }
}
//# sourceMappingURL=handleSetTableTechnicalSettings.js.map