/**
 * GetFunctionGroup Handler - Read ABAP FunctionGroup via AdtClient
 *
 * Uses AdtClient.getFunctionGroup().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP function group definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name (e.g., Z_MY_FUNCTIONGROUP).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["function_group_name"];
    };
};
interface GetFunctionGroupArgs {
    function_group_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetFunctionGroup MCP tool
 *
 * Uses AdtClient.getFunctionGroup().read() - high-level read operation
 */
export declare function handleGetFunctionGroup(context: HandlerContext, args: GetFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetFunctionGroup.d.ts.map