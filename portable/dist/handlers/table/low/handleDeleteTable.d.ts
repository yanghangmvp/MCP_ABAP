/**
 * DeleteTable Handler - Delete ABAP Table
 *
 * Uses AdtClient.deleteTable from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteTableLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Delete an ABAP table from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., Z_MY_PROGRAM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface DeleteTableArgs {
    table_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteTable MCP tool
 *
 * Uses AdtClient.deleteTable - low-level single method call
 */
export declare function handleDeleteTable(context: HandlerContext, args: DeleteTableArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteTable.d.ts.map