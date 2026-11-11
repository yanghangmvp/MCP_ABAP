/**
 * DeleteTableIndex — remove a secondary index from a DDIC table.
 *
 * After the delete the table is re-activated, because the index was part of the
 * table's runtime object: leaving it out of the active definition without
 * re-activating means the database index stays behind. The deletion is then
 * VERIFIED against the system rather than trusted — the same discipline the
 * other Delete* handlers use, and here it matters twice over, since a "deleted"
 * index that is still there keeps its constraint.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteTableIndex";
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
    transport_request?: string;
}
export declare function handleDeleteTableIndex(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteTableIndex.d.ts.map