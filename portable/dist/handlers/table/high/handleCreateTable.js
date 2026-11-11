"use strict";
/**
 * CreateTable Handler - ABAP Table Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * DDL code is set via UpdateTable handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateTable = handleCreateTable;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateTable',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: Table. Create a new ABAP transparent table. NOTE ON SHAPE: this creates an EMPTY table shell only — it takes no fields and no activate parameter. Define the columns afterwards with UpdateTable, passing the complete DDL (define table ... { ... }) and activate there. This differs from CreateStructure, which does accept fields[] inline. Table names are capped at 16 characters.',
    inputSchema: {
        type: 'object',
        properties: {
            table_name: {
                type: 'string',
                description: 'Table name (e.g., ZZ_TEST_TABLE_001). Must follow SAP naming conventions. MAX 16 characters — SAP silently truncates longer names, so an over-long name fails with a misleading "already exists" error.',
            },
            description: {
                type: 'string',
                description: 'Table description for validation and creation.',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
        },
        required: ['table_name', 'package_name'],
    },
};
/**
 * Main handler for CreateTable MCP tool
 */
async function handleCreateTable(context, args) {
    const { connection, logger } = context;
    try {
        const createTableArgs = args;
        // Validate required parameters
        if (!createTableArgs?.table_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Table name is required');
        }
        if (!createTableArgs?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        // Validate transport_request: required for non-$TMP packages
        (0, transportValidation_js_1.validateTransportRequest)(createTableArgs.package_name, createTableArgs.transport_request);
        const tableName = createTableArgs.table_name.toUpperCase();
        // Fail fast on over-long names: SAP silently truncates (max 16 chars for a
        // table) and then reports the truncated name as "already exists".
        (0, utils_1.assertNameLength)('table', tableName, 'Table');
        logger?.info(`Starting table creation: ${tableName}`);
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            // Validate — and fail fast BEFORE create if the name is already taken,
            // instead of discovering the clash only when create() errors.
            await (0, utils_1.assertObjectDoesNotExist)(`Table ${tableName}`, () => client.getTable().validate({
                tableName,
                packageName: createTableArgs.package_name,
                description: createTableArgs.description || tableName,
            }), connection);
            // Create
            await client.getTable().create({
                tableName,
                packageName: createTableArgs.package_name,
                description: createTableArgs.description || tableName,
                ddlCode: '',
                transportRequest: createTableArgs.transport_request,
            });
            logger?.info(`Table created: ${tableName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    table_name: tableName,
                    package_name: createTableArgs.package_name,
                    transport_request: createTableArgs.transport_request || 'local',
                    message: `Table ${tableName} created successfully. Use UpdateTable to set DDL code.`,
                }),
            });
        }
        catch (error) {
            logger?.error(`Error creating table ${tableName}: ${error?.message || error}`);
            // Check if table already exists
            if (error.message?.includes('already exists') ||
                error.response?.status === 409) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Table ${tableName} already exists. Please delete it first or use a different name.`);
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to create table ${tableName}: ${errorMessage}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateTable.js.map