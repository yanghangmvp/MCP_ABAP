import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerQuery";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Read data. operation='sql' (needs sql_query) or 'table' (needs table_name). Optional: max_rows. Response: JSON rows.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly operation: {
                readonly type: "string";
                readonly enum: readonly ["sql", "table"];
                readonly description: "'sql' runs a SELECT; 'table' reads one table's rows.";
            };
            readonly sql_query: {
                readonly type: "string";
                readonly description: "Required for operation='sql'. One SELECT statement.";
            };
            readonly table_name: {
                readonly type: "string";
                readonly description: "Required for operation='table'.";
            };
            readonly max_rows: {
                readonly type: "number";
                readonly description: "Row cap. Default 100.";
            };
        };
        readonly required: readonly ["operation"];
    };
};
type HandlerQueryArgs = {
    operation?: string;
    sql_query?: string;
    table_name?: string;
    max_rows?: number;
};
export declare function handleHandlerQuery(context: HandlerContext, args: HandlerQueryArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerQuery.d.ts.map