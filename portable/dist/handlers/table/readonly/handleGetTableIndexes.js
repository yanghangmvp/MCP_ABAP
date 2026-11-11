"use strict";
/**
 * GetTableIndexes — list a table's secondary indexes and their field lists.
 *
 * This is the only way to answer "does this table have an index?" through ADT:
 * DD12L is refused by the ADT Data Preview, and the index collection's `$values`
 * resource answers 405 for GET. The indexes are TABL/DTI children of the table
 * in `/repository/nodestructure`, and each one's field list lives in its JSON
 * source.
 *
 * A missing index never produces an error, only a slower system, so a read tool
 * is the only thing that can turn "someone must remember" into something a
 * checklist can verify.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetTableIndexes = handleGetTableIndexes;
const clients_1 = require("../../../lib/clients");
const tableIndexXml_1 = require("../../../lib/tableIndexXml");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetTableIndexes',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Operation: Read. Subject: Table secondary indexes (SE11, DDIC type TABL/DTI). ' +
        'List every secondary index of a table with its field list, uniqueness flag and ' +
        'buffer-only flag. Use this to VERIFY that an index was really created — DD12L cannot be ' +
        'read through the Data Preview, so this is the only way to see a table’s indexes. ' +
        'Note primary keys are not indexes and are not listed here.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., ZMY_TABLE).',
            },
            include_fields: {
                type: 'boolean',
                description: 'Read each index’s field list (one extra request per index). Default true; ' +
                    'set false for a fast name-only listing on a table with many indexes.',
            },
        },
        required: ['table_name'],
    },
};
async function handleGetTableIndexes(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.table_name) {
            return (0, utils_1.return_error)(new Error('table_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const tableName = args.table_name.toUpperCase();
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/repository/nodestructure', 'POST', 'default', undefined, {
            parent_type: 'TABL/DT',
            parent_name: tableName,
            withShortDescriptions: 'true',
        }, { 'Content-Type': 'application/x-www-form-urlencoded' });
        const body = String(response?.data ?? '');
        // A table that does not exist still answers 200 with an empty tree, so tell
        // "no indexes" apart from "no such table" instead of reporting an empty list
        // for a typo.
        if (!body.includes('SEU_ADT_REPOSITORY_OBJ_NODE')) {
            return (0, utils_1.return_error)(new Error(`No repository nodes returned for table ${tableName}. Check the name — a ` +
                'nonexistent table answers with an empty tree, not an error.'));
        }
        const entries = (0, tableIndexXml_1.parseTableIndexNodes)(body);
        const includeFields = args.include_fields !== false;
        const indexes = [];
        /** Names the repository tree still lists but that no longer exist. */
        const stale = [];
        for (const entry of entries) {
            const record = {
                index_id: entry.index_id,
                name: entry.name || `${tableName}~${entry.index_id}`,
                description: entry.description,
                uri: entry.uri || (0, tableIndexXml_1.tableIndexUri)(tableName, entry.index_id),
            };
            if (includeFields) {
                try {
                    // The index SOURCE is JSON — sending the metadata media type here
                    // answers 406 ExceptionResourceNotAcceptable.
                    const src = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `${(0, tableIndexXml_1.tableIndexUri)(tableName, entry.index_id)}/source/main`, 'GET', 'default', undefined, undefined, { Accept: tableIndexXml_1.CT_TABLE_INDEX_SOURCE });
                    const parsed = (0, tableIndexXml_1.parseTableIndexSource)(src?.data);
                    if (parsed) {
                        record.fields = (parsed.indexFields ?? []).map((f) => f.fieldName);
                        record.unique = parsed.uniqueIndex === true;
                        record.buffer_index_only = parsed.bufferIndexOnly === true;
                        record.text_index = parsed.textIndex === true;
                    }
                    else {
                        record.fields_error = 'Index source could not be parsed as JSON.';
                    }
                }
                catch (e) {
                    // A 404 means the repository TREE is stale: SAP keeps a just-deleted
                    // index in the node structure for a while. Listing it would make this
                    // tool — the one used to VERIFY an index exists — report an index that
                    // does not. Drop it and account for it separately.
                    if (e?.response?.status === 404) {
                        stale.push(record.name);
                        continue;
                    }
                    record.fields_error = `Could not read the index source: ${e?.message || e}`;
                }
            }
            indexes.push(record);
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                table_name: tableName,
                index_count: indexes.length,
                indexes,
                ...(stale.length
                    ? {
                        stale_repository_nodes: stale,
                        note_stale: 'These names are still in SAP’s repository tree but the objects no longer ' +
                            'exist (a just-deleted index lingers there for a while). They are excluded ' +
                            'from index_count.',
                    }
                    : {}),
                ...(indexes.length === 0
                    ? {
                        note: `Table ${tableName} has no secondary indexes. Its primary key is not listed here.`,
                    }
                    : {}),
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
        let message = `Error listing indexes of ${args?.table_name}: ${error instanceof Error ? error.message : String(error)}`;
        if (body)
            message += ` | ADT: ${body.slice(0, 800)}`;
        logger?.error(message);
        return (0, utils_1.return_error)(new Error(message));
    }
}
//# sourceMappingURL=handleGetTableIndexes.js.map