/**
 * DeleteInterface Handler - Delete ABAP Interface
 *
 * Uses AdtClient.deleteInterface from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteInterfaceLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Delete an ABAP interface from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., Z_MY_PROGRAM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["interface_name"];
    };
};
interface DeleteInterfaceArgs {
    interface_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteInterface MCP tool
 *
 * Uses AdtClient.deleteInterface - low-level single method call
 */
export declare function handleDeleteInterface(context: HandlerContext, args: DeleteInterfaceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteInterface.d.ts.map