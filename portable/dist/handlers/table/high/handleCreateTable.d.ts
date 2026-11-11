/**
 * CreateTable Handler - ABAP Table Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * DDL code is set via UpdateTable handler.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateTable";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: Table. Create a new ABAP transparent table. NOTE ON SHAPE: this creates an EMPTY table shell only — it takes no fields and no activate parameter. Define the columns afterwards with UpdateTable, passing the complete DDL (define table ... { ... }) and activate there. This differs from CreateStructure, which does accept fields[] inline. Table names are capped at 16 characters.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZZ_TEST_TABLE_001). Must follow SAP naming conventions. MAX 16 characters — SAP silently truncates longer names, so an over-long name fails with a misleading \"already exists\" error.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Table description for validation and creation.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
        };
        readonly required: readonly ["table_name", "package_name"];
    };
};
interface CreateTableArgs {
    table_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
}
/**
 * Main handler for CreateTable MCP tool
 */
export declare function handleCreateTable(context: HandlerContext, args: CreateTableArgs): Promise<any>;
export {};
//# sourceMappingURL=handleCreateTable.d.ts.map