/**
 * DeleteFunctionGroup Handler - Delete ABAP FunctionGroup
 *
 * Uses AdtClient.deleteFunctionGroup from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteFunctionGroupLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Delete an ABAP function group from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name (e.g., Z_MY_PROGRAM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["function_group_name"];
    };
};
interface DeleteFunctionGroupArgs {
    function_group_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteFunctionGroup MCP tool
 *
 * Uses AdtClient.deleteFunctionGroup - low-level single method call
 */
export declare function handleDeleteFunctionGroup(context: HandlerContext, args: DeleteFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteFunctionGroup.d.ts.map