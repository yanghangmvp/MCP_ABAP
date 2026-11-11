/**
 * DeleteMetadataExtension Handler - Delete ABAP MetadataExtension via AdtClient
 *
 * Uses AdtClient.getMetadataExtension().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteMetadataExtension";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP metadata extension from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly metadata_extension_name: {
                readonly type: "string";
                readonly description: "MetadataExtension name (e.g., Z_MY_METADATAEXTENSION).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["metadata_extension_name"];
    };
};
interface DeleteMetadataExtensionArgs {
    metadata_extension_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteMetadataExtension MCP tool
 *
 * Uses AdtClient.getMetadataExtension().delete() - high-level delete operation with deletion check
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