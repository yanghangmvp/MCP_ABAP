/**
 * DeleteBehaviorDefinition Handler - Delete ABAP Behavior Definition
 *
 * Uses AdtClient.deleteBehaviorDefinition from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteBehaviorDefinitionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Delete an ABAP behavior definition from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name (e.g., ZI_MY_BDEF).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["name"];
    };
};
interface DeleteBehaviorDefinitionArgs {
    name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteBehaviorDefinition MCP tool
 *
 * Uses AdtClient.deleteBehaviorDefinition - low-level single method call
 */
export declare function handleDeleteBehaviorDefinition(context: HandlerContext, args: DeleteBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteBehaviorDefinition.d.ts.map