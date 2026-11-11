/**
 * GetFunctionModule Handler - Read ABAP FunctionModule via AdtClient
 *
 * Uses AdtClient.getFunctionModule().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetFunctionModule";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "FunctionModule name (e.g., Z_MY_FUNCTIONMODULE).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: string;
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["function_module_name"];
    };
};
interface GetFunctionModuleArgs {
    function_module_name: string;
    function_group_name?: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetFunctionModule MCP tool
 *
 * Uses AdtClient.getFunctionModule().read() - high-level read operation
 */
export declare function handleGetFunctionModule(context: HandlerContext, args: GetFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetFunctionModule.d.ts.map