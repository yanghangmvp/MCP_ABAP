/**
 * DeleteClass Handler - Delete ABAP Class via AdtClient
 *
 * Uses AdtClient.getClass().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete an ABAP class from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface DeleteClassArgs {
    class_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteClass MCP tool
 *
 * Uses AdtClient.getClass().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteClass(context: HandlerContext, args: DeleteClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteClass.d.ts.map