/**
 * GetMetadataExtension Handler - Read ABAP MetadataExtension via AdtClient
 *
 * Uses AdtClient.getMetadataExtension().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetMetadataExtension";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP metadata extension definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly metadata_extension_name: {
                readonly type: "string";
                readonly description: "MetadataExtension name (e.g., Z_MY_METADATAEXTENSION).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["metadata_extension_name"];
    };
};
interface GetMetadataExtensionArgs {
    metadata_extension_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetMetadataExtension MCP tool
 *
 * Uses AdtClient.getMetadataExtension().read() - high-level read operation
 */
export declare function handleGetMetadataExtension(context: HandlerContext, args: GetMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetMetadataExtension.d.ts.map