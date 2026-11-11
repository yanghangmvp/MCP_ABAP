/**
 * GetTable Handler - Read ABAP Table via AdtClient
 *
 * Uses AdtClient.getTable().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTable";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP table definition. Supports reading active or inactive version.";
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
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface GetTableArgs {
    table_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetTable MCP tool
 *
 * Uses AdtClient.getTable().read() - high-level read operation
 */
export declare function handleGetTable(context: HandlerContext, args: GetTableArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetTable.d.ts.map