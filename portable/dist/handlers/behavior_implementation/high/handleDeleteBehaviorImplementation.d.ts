/**
 * DeleteBehaviorImplementation Handler - Delete ABAP BehaviorImplementation via AdtClient
 *
 * Uses AdtClient.getBehaviorImplementation().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteBehaviorImplementation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP behavior implementation from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_implementation_name: {
                readonly type: "string";
                readonly description: "BehaviorImplementation name (e.g., Z_MY_BEHAVIORIMPLEMENTATION).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["behavior_implementation_name"];
    };
};
interface DeleteBehaviorImplementationArgs {
    behavior_implementation_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteBehaviorImplementation MCP tool
 *
 * Uses AdtClient.getBehaviorImplementation().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteBehaviorImplementation(context: HandlerContext, args: DeleteBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteBehaviorImplementation.d.ts.map