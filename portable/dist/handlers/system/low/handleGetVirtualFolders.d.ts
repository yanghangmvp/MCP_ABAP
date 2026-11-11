/**
 * GetVirtualFolders Handler - Low-level handler for virtual folders
 *
 * Uses getVirtualFoldersContents from @mcp-abap-adt/adt-clients AdtUtils.
 * Retrieves hierarchical virtual folder contents from ADT information system.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetVirtualFoldersLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Retrieve hierarchical virtual folder contents from ADT information system. Used for browsing ABAP objects by package, group, type, etc.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_search_pattern: {
                readonly type: "string";
                readonly description: "Object search pattern (e.g., \"*\", \"Z*\", \"ZCL_*\"). Default: \"*\"";
                readonly default: "*";
            };
            readonly preselection: {
                readonly type: "array";
                readonly description: "Optional preselection filters (facet-value pairs for filtering)";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly facet: {
                            readonly type: "string";
                            readonly description: "Facet name (e.g., \"package\", \"group\", \"type\")";
                        };
                        readonly values: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                            readonly description: "Array of facet values to filter by";
                        };
                    };
                    readonly required: readonly ["facet", "values"];
                };
            };
            readonly facet_order: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: "Order of facets in response (e.g., [\"package\", \"group\", \"type\"]). Default: [\"package\", \"group\", \"type\"]";
                readonly default: readonly ["package", "group", "type"];
            };
            readonly with_versions: {
                readonly type: "boolean";
                readonly description: "Include version information in response";
                readonly default: false;
            };
            readonly ignore_short_descriptions: {
                readonly type: "boolean";
                readonly description: "Ignore short descriptions in response";
                readonly default: false;
            };
        };
        readonly required: readonly [];
    };
};
interface GetVirtualFoldersArgs {
    object_search_pattern?: string;
    preselection?: Array<{
        facet: string;
        values: string[];
    }>;
    facet_order?: string[];
    with_versions?: boolean;
    ignore_short_descriptions?: boolean;
}
/**
 * Main handler for GetVirtualFoldersLow MCP tool
 *
 * Uses getVirtualFoldersContents from AdtUtils
 */
export declare function handleGetVirtualFolders(context: HandlerContext, args: GetVirtualFoldersArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetVirtualFolders.d.ts.map