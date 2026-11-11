/**
 * UpdateFunctionGroup Handler - Update Existing ABAP Function Group Metadata
 *
 * Function groups are containers for function modules and don't have source code to update.
 * This handler updates function group metadata (description).
 *
 * Uses low-level updateFunctionGroup function from @mcp-abap-adt/adt-clients.
 * Session and lock management handled internally
import { AbapConnection } from '@mcp-abap-adt/connection';.
 *
 * Workflow: lock -> get current -> update metadata -> unlock
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update metadata (description) of an existing ABAP function group. Function groups are containers for function modules and don't have source code to update directly. Uses stateful session with proper lock/unlock mechanism.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZTEST_FG_001). Must exist in the system.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "New description for the function group.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.";
            };
        };
        readonly required: readonly ["function_group_name", "description"];
    };
};
interface UpdateFunctionGroupArgs {
    function_group_name: string;
    description: string;
    transport_request?: string;
}
/**
 * Main handler for UpdateFunctionGroup MCP tool
 *
 * Uses low-level updateFunctionGroup function
 * Session and lock management handled internally
 */
export declare function handleUpdateFunctionGroup(context: HandlerContext, args: UpdateFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateFunctionGroup.d.ts.map