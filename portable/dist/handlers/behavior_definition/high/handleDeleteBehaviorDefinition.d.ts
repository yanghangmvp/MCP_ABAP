/**
 * DeleteBehaviorDefinition Handler - Delete ABAP BehaviorDefinition via AdtClient
 *
 * Uses AdtClient.getBehaviorDefinition().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteBehaviorDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP behavior definition from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_definition_name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name (e.g., Z_MY_BEHAVIORDEFINITION).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["behavior_definition_name"];
    };
};
interface DeleteBehaviorDefinitionArgs {
    behavior_definition_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteBehaviorDefinition MCP tool
 *
 * Uses AdtClient.getBehaviorDefinition().delete() - high-level delete operation with deletion check
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