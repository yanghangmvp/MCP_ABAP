/**
 * CreateTableIndex — create a secondary index on a DDIC table (SE11).
 *
 * The whole operation is done in ONE call — metadata, field list, activation —
 * because the intermediate states are dangerous rather than merely incomplete:
 * an index with no fields makes its own TABLE refuse to activate
 * (`[E] Index <TAB>-<ID> does not contain fields`). So a create that cannot be
 * finished removes the shell it made instead of handing back a broken table.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateTableIndex";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table the index belongs to (e.g., ZMY_TABLE).";
            };
            readonly index_id: {
                readonly type: "string";
                readonly description: string;
            };
            readonly fields: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: string;
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Short description of the index (max 60 chars).";
            };
            readonly unique: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly buffer_index_only: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package for the index object. Defaults to $TMP. Normally the table’s own package.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required when the package is transportable.";
            };
        };
        readonly required: readonly ["table_name", "index_id", "fields"];
    };
};
interface Args {
    table_name: string;
    index_id: string;
    fields: string[];
    description?: string;
    unique?: boolean;
    buffer_index_only?: boolean;
    package_name?: string;
    transport_request?: string;
}
export declare function handleCreateTableIndex(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateTableIndex.d.ts.map