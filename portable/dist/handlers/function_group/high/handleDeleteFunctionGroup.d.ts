/**
 * DeleteFunctionGroup Handler - Delete ABAP FunctionGroup via AdtClient
 *
 * Uses AdtClient.getFunctionGroup().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete an ABAP function group from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "FunctionGroup name (e.g., Z_MY_FUNCTIONGROUP).";
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
 * Uses AdtClient.getFunctionGroup().delete() - high-level delete operation with deletion check
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