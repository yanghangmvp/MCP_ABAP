"use strict";
/**
 * UpdateTableIndex — change an existing index's field list or flags.
 *
 * Read-modify-write on the index's JSON source: an omitted field keeps its
 * current value. `fields` is a full REPLACEMENT of the field list when given,
 * because the order of index fields is meaningful and a merge would have no
 * defensible semantics — but it is only replaced when explicitly passed, so
 * flipping `unique` alone cannot silently drop the columns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateTableIndex = handleUpdateTableIndex;
const clients_1 = require("../../../lib/clients");
const tableIndexOps_1 = require("../../../lib/tableIndexOps");
const tableIndexXml_1 = require("../../../lib/tableIndexXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'UpdateTableIndex',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Update. Subject: Table secondary index (SE11, DDIC type TABL/DTI). ' +
        'Change an existing index’s field list, description, uniqueness or buffer-only flag, then ' +
        'activate it together with its table. Only the fields you pass change. ' +
        'NOTE: when `fields` is given it REPLACES the whole field list, because index field order ' +
        'is significant.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table the index belongs to.',
            },
            index_id: {
                type: 'string',
                description: 'Index id (max 3 characters), e.g. "VER".',
            },
            fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'New field list IN ORDER. REPLACES the existing list entirely. Omit to keep it.',
            },
            description: { type: 'string', description: 'New description.' },
            unique: { type: 'boolean', description: 'New uniqueness flag.' },
            buffer_index_only: {
                type: 'boolean',
                description: 'New "table buffer only, not on the database" flag.',
            },
            activate: {
                type: 'boolean',
                description: 'Activate the index and its table after the change. Default TRUE — an inactive index ' +
                    'has no effect on the database, and leaving it inactive can block the table.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request, when the package is transportable.',
            },
        },
        required: ['table_name', 'index_id'],
    },
};
async function handleUpdateTableIndex(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        if (!args?.index_id) {
            return (0, utils_1.return_error)(new Error('index_id is required'));
        }
        const nothingToDo = args.fields === undefined &&
            args.description === undefined &&
            args.unique === undefined &&
            args.buffer_index_only === undefined;
        if (nothingToDo) {
            return (0, utils_1.return_error)(new Error('Nothing to change. Pass at least one of fields, description, unique or ' +
                'buffer_index_only. Use GetTableIndexes to read the current state.'));
        }
        if (args.fields !== undefined && args.fields.length === 0) {
            return (0, utils_1.return_error)(new Error('fields must not be empty. An index with no fields makes its table fail to ' +
                'activate — use DeleteTableIndex to remove the index instead.'));
        }
        const tableName = args.table_name.toUpperCase();
        const indexId = args.index_id.toUpperCase();
        const name = (0, tableIndexXml_1.tableIndexName)(tableName, indexId);
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        // Read the current source so an omitted field keeps its value.
        const current = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `${(0, tableIndexXml_1.tableIndexUri)(tableName, indexId)}/source/main`, 'GET', 'default', undefined, undefined, 
        // The index source is JSON; the metadata media type answers 406.
        { Accept: tableIndexXml_1.CT_TABLE_INDEX_SOURCE });
        const existing = (0, tableIndexXml_1.parseTableIndexSource)(current?.data);
        if (!existing) {
            return (0, utils_1.return_error)(new Error(`Could not read the current definition of index ${name}. It may not exist — ` +
                `check with GetTableIndexes { table_name: "${tableName}" }.`));
        }
        const source = (0, tableIndexXml_1.buildTableIndexSource)({
            description: args.description ?? existing.header?.description ?? name,
            fields: args.fields ?? (existing.indexFields ?? []).map((f) => f.fieldName),
            unique: args.unique ?? existing.uniqueIndex,
            bufferIndexOnly: args.buffer_index_only ?? existing.bufferIndexOnly,
            textIndex: existing.textIndex,
            originalLanguage: existing.header?.originalLanguage,
        });
        await (0, tableIndexOps_1.writeTableIndexSource)(connection, tableName, indexId, source, args.transport_request);
        const shouldActivate = args.activate !== false;
        const activation = shouldActivate
            ? await (0, tableIndexOps_1.activateIndexWithTable)(connection, tableName, indexId)
            : undefined;
        if (activation && !activation.success) {
            return (0, utils_1.return_error)(new Error(`Index ${name} was updated but could NOT be activated: ${activation.description}. ` +
                'The stored definition is the new one, so the index is inactive and may block the ' +
                `table — fix the field list or restore it with UpdateTableIndex.`));
        }
        const written = (0, tableIndexXml_1.parseTableIndexSource)(source);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                table_name: tableName,
                index_id: indexId,
                index_name: name,
                fields: (written?.indexFields ?? []).map((f) => f.fieldName),
                unique: written?.uniqueIndex === true,
                buffer_index_only: written?.bufferIndexOnly === true,
                activated: activation ? activation.activated : false,
                ...(activation ? { messages: activation.messages } : {}),
                transport_request: args.transport_request || 'local',
                message: `Index ${name} updated${shouldActivate ? ' and activated' : ' (left INACTIVE)'}. ` +
                    `Verify with GetTableIndexes { table_name: "${tableName}" }.`,
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
        let message = `Failed to update index ${args?.table_name}~${args?.index_id}: ${error instanceof Error ? error.message : String(error)}`;
        if (body)
            message += ` | ADT: ${body.slice(0, 1000)}`;
        logger?.error(message);
        return (0, utils_1.return_error)(new Error(message));
    }
}
//# sourceMappingURL=handleUpdateTableIndex.js.map