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
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTableIndexes";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZMY_TABLE).";
            };
            readonly include_fields: {
                readonly type: "boolean";
                readonly description: string;
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface Args {
    table_name: string;
    include_fields?: boolean;
}
export declare function handleGetTableIndexes(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetTableIndexes.d.ts.map