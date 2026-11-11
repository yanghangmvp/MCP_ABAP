/**
 * DeleteView Handler - Delete ABAP View via AdtClient
 *
 * Uses AdtClient.getView().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteView";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete an ABAP view from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., Z_MY_VIEW).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["view_name"];
    };
};
interface DeleteViewArgs {
    view_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteView MCP tool
 *
 * Uses AdtClient.getView().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteView(context: HandlerContext, args: DeleteViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteView.d.ts.map