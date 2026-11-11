/**
 * DeleteFunctionModule Handler - Delete ABAP FunctionModule via AdtClient
 *
 * Uses AdtClient.getFunctionModule().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteFunctionModule";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete an ABAP function module from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "FunctionModule name (e.g., Z_MY_FUNCTIONMODULE).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name containing the function module (e.g., Z_MY_FUNCTIONGROUP).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["function_module_name", "function_group_name"];
    };
};
interface DeleteFunctionModuleArgs {
    function_module_name: string;
    function_group_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteFunctionModule MCP tool
 *
 * Uses AdtClient.getFunctionModule().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteFunctionModule(context: HandlerContext, args: DeleteFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteFunctionModule.d.ts.map