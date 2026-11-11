import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckTable";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Perform syntax check on an ABAP table. Checks the stored version, or DDL you supply for an existing table. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZMCP_MY_TABLE).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to check: 'active', 'inactive', or 'new'. Default: active — a table with no inactive version cannot be checked as 'inactive'/'new' (SAP answers \"Error while importing object ... from the database\").";
                readonly enum: readonly ["active", "inactive", "new"];
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Optional: DDL source code to validate instead of the saved version.";
            };
        };
        readonly required: readonly ["table_name"];
    };
};
export declare function handleCheckTable(context: HandlerContext, args: {
    table_name: string;
    version?: string;
    ddl_code?: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckTable.d.ts.map