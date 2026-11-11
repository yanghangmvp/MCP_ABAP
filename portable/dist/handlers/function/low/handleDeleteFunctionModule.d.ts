/**
 * DeleteFunctionModule Handler - Delete ABAP Function Module
 *
 * Uses AdtClient.deleteFunctionModule from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteFunctionModuleLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Delete an ABAP function module from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_MY_FUNCTION).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZFG_MY_GROUP).";
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
 * Uses AdtClient.deleteFunctionModule - low-level single method call
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