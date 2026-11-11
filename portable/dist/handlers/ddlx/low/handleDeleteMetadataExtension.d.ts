/**
 * DeleteMetadataExtension Handler - Delete ABAP MetadataExtension
 *
 * Uses AdtClient.deleteMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteMetadataExtensionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Delete an ABAP metadata extension from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "MetadataExtension name (e.g., ZI_MY_DDLX).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["name"];
    };
};
interface DeleteMetadataExtensionArgs {
    name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteMetadataExtension MCP tool
 *
 * Uses AdtClient.deleteMetadataExtension - low-level single method call
 */
export declare function handleDeleteMetadataExtension(context: HandlerContext, args: DeleteMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteMetadataExtension.d.ts.map