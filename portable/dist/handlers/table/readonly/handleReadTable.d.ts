import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadTable";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Read, Create, Update. Subject: Table. Will be useful for reading, creating, or updating table. [read-only] Read ABAP table definition and metadata. Answers: \"show table fields\", \"display table structure\", \"view table X\", \"get table definition\". Returns field list, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., Z_MY_TABLE).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["table_name"];
    };
};
export declare function handleReadTable(context: HandlerContext, args: {
    table_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadTable.d.ts.map