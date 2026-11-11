"use strict";
/**
 * CreateTableIndex — create a secondary index on a DDIC table (SE11).
 *
 * The whole operation is done in ONE call — metadata, field list, activation —
 * because the intermediate states are dangerous rather than merely incomplete:
 * an index with no fields makes its own TABLE refuse to activate
 * (`[E] Index <TAB>-<ID> does not contain fields`). So a create that cannot be
 * finished removes the shell it made instead of handing back a broken table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateTableIndex = handleCreateTableIndex;
const clients_1 = require("../../../lib/clients");
const systemContext_1 = require("../../../lib/systemContext");
const tableIndexOps_1 = require("../../../lib/tableIndexOps");
const tableIndexXml_1 = require("../../../lib/tableIndexXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CreateTableIndex',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: Table secondary index (SE11, DDIC type TABL/DTI). ' +
        'Create a secondary index on a DDIC table: metadata, field list and activation in one call. ' +
        'The index and its table are activated TOGETHER — they are mutually dependent, and an index ' +
        'with no fields makes the table itself fail to activate. ' +
        'Verify the result with GetTableIndexes.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table the index belongs to (e.g., ZMY_TABLE).',
            },
            index_id: {
                type: 'string',
                description: 'Index id, max 3 characters (SAP convention), e.g. "VER". The full object name ' +
                    'becomes TABLE~ID. Must not clash with an existing index of the table.',
            },
            fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Index fields IN ORDER — the order determines which queries the index serves. ' +
                    'For a client-dependent table the client field (usually MANDT) normally comes first. ' +
                    'Names must be columns of the table; duplicates are removed.',
            },
            description: {
                type: 'string',
                description: 'Short description of the index (max 60 chars).',
            },
            unique: {
                type: 'boolean',
                description: 'Create a UNIQUE index (DD12L-UNIQUEFLAG). Default false. A unique index is a ' +
                    'constraint: activation fails if the table already holds duplicate rows.',
            },
            buffer_index_only: {
                type: 'boolean',
                description: 'Index for the ABAP table buffer only, NOT created on the database. Default false. ' +
                    'This is SAP’s "index does not exist in the database" flag.',
            },
            package_name: {
                type: 'string',
                description: 'Package for the index object. Defaults to $TMP. Normally the table’s own package.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required when the package is transportable.',
            },
        },
        required: ['table_name', 'index_id', 'fields'],
    },
};
async function handleCreateTableIndex(context, args) {
    const { connection, logger } = context;
    let created = false;
    let tableName = '';
    let indexId = '';
    try {
        if (!args?.table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        if (!args?.index_id) {
            return (0, utils_1.return_error)(new Error('index_id is required'));
        }
        if (!Array.isArray(args?.fields) || args.fields.length === 0) {
            return (0, utils_1.return_error)(new Error('fields is required and must list at least one column. An index with no fields ' +
                'makes its table fail to activate, so it is refused here rather than created.'));
        }
        tableName = args.table_name.toUpperCase();
        indexId = args.index_id.toUpperCase();
        if (indexId.length > 3) {
            return (0, utils_1.return_error)(new Error(`index_id "${indexId}" is ${indexId.length} characters; SAP index ids are at most 3. ` +
                'A longer id is silently truncated, which then collides with a different index.'));
        }
        const name = (0, tableIndexXml_1.tableIndexName)(tableName, indexId);
        const packageName = (args.package_name || '$TMP').toUpperCase();
        const description = args.description || name;
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const sysContext = (0, systemContext_1.getSystemContext)();
        logger?.info(`Creating index ${name} on fields ${args.fields.join(',')}`);
        // POST the metadata. Explicit stateless header: a lingering stateful server
        // session left by an earlier op makes a create hold an implicit edit lock,
        // and the very next step here needs to lock the object.
        const body = (0, tableIndexXml_1.buildTableIndexCreateXml)({
            tableName,
            indexId,
            packageName,
            description,
            masterLanguage: sysContext.masterLanguage,
            masterSystem: sysContext.masterSystem,
            responsible: sysContext.responsible,
        });
        const restoreStateless = (0, utils_1.withExplicitStatelessHeader)(connection);
        try {
            await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/ddic/db/indexes', 'POST', 'default', body, args.transport_request ? { corrNr: args.transport_request } : undefined, { 'Content-Type': tableIndexXml_1.CT_TABLE_INDEX, Accept: tableIndexXml_1.CT_TABLE_INDEX });
        }
        finally {
            restoreStateless();
        }
        created = true;
        // Write the field list. Until this succeeds the index is a shell that would
        // break the table's activation.
        await (0, tableIndexOps_1.writeTableIndexSource)(connection, tableName, indexId, (0, tableIndexXml_1.buildTableIndexSource)({
            description,
            fields: args.fields,
            unique: args.unique,
            bufferIndexOnly: args.buffer_index_only,
            originalLanguage: sysContext.masterLanguage,
        }), args.transport_request);
        const activation = await (0, tableIndexOps_1.activateIndexWithTable)(connection, tableName, indexId);
        if (!activation.success) {
            // The index exists but does not work, and it may now be blocking the
            // table. Remove it and say what happened, rather than reporting a
            // half-success the caller has to guess about.
            const cleanupWarning = await (0, tableIndexOps_1.removeIndexShell)(connection, tableName, indexId, args.transport_request);
            return (0, utils_1.return_error)(new Error(`Index ${name} could not be activated: ${activation.description}. ` +
                (cleanupWarning
                    ? cleanupWarning
                    : `The index was removed again, so table ${tableName} is unaffected. ` +
                        'Check that every field exists in the table and, for unique=true, that the ' +
                        'table holds no duplicate rows.')));
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                table_name: tableName,
                index_id: indexId,
                index_name: name,
                uri: (0, tableIndexXml_1.tableIndexUri)(tableName, indexId),
                fields: args.fields.map((f) => String(f).toUpperCase()),
                unique: args.unique === true,
                buffer_index_only: args.buffer_index_only === true,
                package_name: packageName,
                transport_request: args.transport_request || 'local',
                activated: activation.activated,
                messages: activation.messages,
                message: `Index ${name} created and activated on ${args.fields.length} field(s). ` +
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
        let message = `Failed to create index ${tableName && indexId ? (0, tableIndexXml_1.tableIndexName)(tableName, indexId) : ''}: ${error instanceof Error ? error.message : String(error)}`;
        if (error?.response?.status === 404) {
            message += ` | Table ${tableName} may not exist.`;
        }
        if (body)
            message += ` | ADT: ${body.slice(0, 1000)}`;
        // Never leave a field-less index behind: it would stop the table activating.
        if (created) {
            const cleanupWarning = await (0, tableIndexOps_1.removeIndexShell)(connection, tableName, indexId, args?.transport_request).catch(() => null);
            message += cleanupWarning
                ? ` | ${cleanupWarning}`
                : ' | The incomplete index was removed again.';
        }
        logger?.error(message);
        return (0, utils_1.return_error)(new Error(message));
    }
}
//# sourceMappingURL=handleCreateTableIndex.js.map