/**
 * UpdateTableIndex — change an existing index's field list or flags.
 *
 * Read-modify-write on the index's JSON source: an omitted field keeps its
 * current value. `fields` is a full REPLACEMENT of the field list when given,
 * because the order of index fields is meaningful and a merge would have no
 * defensible semantics — but it is only replaced when explicitly passed, so
 * flipping `unique` alone cannot silently drop the columns.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateTableIndex";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table the index belongs to.";
            };
            readonly index_id: {
                readonly type: "string";
                readonly description: "Index id (max 3 characters), e.g. \"VER\".";
            };
            readonly fields: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: "New field list IN ORDER. REPLACES the existing list entirely. Omit to keep it.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "New description.";
            };
            readonly unique: {
                readonly type: "boolean";
                readonly description: "New uniqueness flag.";
            };
            readonly buffer_index_only: {
                readonly type: "boolean";
                readonly description: "New \"table buffer only, not on the database\" flag.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request, when the package is transportable.";
            };
        };
        readonly required: readonly ["table_name", "index_id"];
    };
};
interface Args {
    table_name: string;
    index_id: string;
    fields?: string[];
    description?: string;
    unique?: boolean;
    buffer_index_only?: boolean;
    activate?: boolean;
    transport_request?: string;
}
export declare function handleUpdateTableIndex(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateTableIndex.d.ts.map