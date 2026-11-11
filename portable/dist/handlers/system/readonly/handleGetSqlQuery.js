"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.parseSqlQueryXml = parseSqlQueryXml;
exports.handleGetSqlQuery = handleGetSqlQuery;
const clients_1 = require("../../../lib/clients");
const dataPreviewParser_1 = require("../../../lib/dataPreviewParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetSqlQuery',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Execute ABAP SQL SELECT queries on database tables and CDS views via SAP ADT Data ' +
        'Preview API. Use for ad-hoc data retrieval, row counts, and filtered queries. ' +
        'A blank cell is returned as an empty string, never as a missing row. ' +
        'IMPORTANT: total_rows is SAP’s own <totalRows> and is 0 unless a count was requested — ' +
        'branch on returned_rows, never on total_rows. ' +
        'Data Preview does not support JOINs and does not expose every column of every table.',
    inputSchema: {
        type: 'object',
        properties: {
            sql_query: {
                type: 'string',
                description: 'SQL query to execute. Single table only — JOINs are rejected by Data Preview.',
            },
            row_number: {
                type: 'number',
                description: '[read-only] Maximum number of rows to return',
                default: 100,
            },
        },
        required: ['sql_query'],
    },
};
/**
 * Parse SAP ADT XML response from a freestyle SQL query.
 *
 * Kept as a named export because handleGetTableContents and handleGetTransaction
 * parse the same payload. The parsing itself lives in lib/dataPreviewParser —
 * see that file for why the previous regex implementation dropped blank cells
 * and shifted values between rows.
 */
function parseSqlQueryXml(xmlData, sqlQuery, rowNumber, logger) {
    try {
        return {
            sql_query: sqlQuery,
            row_number: rowNumber,
            ...(0, dataPreviewParser_1.parseDataPreviewXml)(xmlData, rowNumber),
        };
    }
    catch (parseError) {
        logger?.error('Failed to parse SQL query XML:', parseError);
        return {
            sql_query: sqlQuery,
            row_number: rowNumber,
            returned_rows: 0,
            columns: [],
            rows: [],
            error: 'Failed to parse XML response',
        };
    }
}
/**
 * Handler to execute freestyle SQL queries via SAP ADT Data Preview API
 *
 * @param args - Tool arguments containing sql_query and optional row_number parameter
 * @returns Response with parsed SQL query results or error
 */
async function handleGetSqlQuery(context, args) {
    const { connection, logger } = context;
    const sqlQuery = args?.sql_query;
    try {
        logger?.info('handleGetSqlQuery called');
        if (!sqlQuery) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'SQL query is required');
        }
        const rowNumber = args.row_number || 100; // Default to 100 rows if not specified
        logger?.info(`Executing SQL query (rows=${rowNumber})`);
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const runQuery = () => client
            .getUtils()
            .getSqlQuery({ sql_query: sqlQuery, row_number: rowNumber });
        // A session-class failure arrives as HTTP 400, which at the caller's level
        // is indistinguishable from "your SQL is wrong" — so it makes an agent
        // rewrite a perfectly good query. Retry those once, transparently.
        let response;
        try {
            response = await runQuery();
        }
        catch (error) {
            if (!(0, dataPreviewParser_1.isSessionError)(error))
                throw error;
            logger?.warn('SQL query failed with a session-level error; retrying once transparently');
            response = await runQuery();
        }
        if (response.status === 200 && response.data) {
            logger?.info('SQL query request completed successfully');
            const parsedData = parseSqlQueryXml(response.data, sqlQuery, rowNumber, logger);
            logger?.debug(`Parsed SQL query data: rows=${parsedData.rows.length}, columns=${parsedData.columns.length}`);
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(parsedData, null, 2),
                    },
                ],
            };
        }
        else {
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to execute SQL query. Status: ${response.status}`);
        }
    }
    catch (error) {
        logger?.error('Failed to execute SQL query', error);
        // MCP-compliant error response: always return content[] with type "text".
        // The message carries SAP's own reason (unknown column, session timeout,
        // JOIN rejection) instead of a bare axios status.
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: error instanceof utils_1.McpError
                        ? String(error.message)
                        : (0, dataPreviewParser_1.describeDataPreviewError)(error, sqlQuery),
                },
            ],
        };
    }
}
//# sourceMappingURL=handleGetSqlQuery.js.map