/**
 * GetPackageTree Handler - High-level handler for package tree structure
 *
 * Builds a complete tree of package contents (subpackages + objects)
 * using AdtClient.getPackageHierarchy() from @mcp-abap-adt/adt-clients.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetPackageTree";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[high-level] Retrieve complete package tree structure including subpackages and objects. Returns hierarchical tree with object names, types, and descriptions.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., \"ZMY_PACKAGE\")";
            };
            readonly include_subpackages: {
                readonly type: "boolean";
                readonly description: "Include subpackages recursively in the tree. If false, subpackages are shown as first-level objects but not recursively expanded. Default: true";
                readonly default: true;
            };
            readonly max_depth: {
                readonly type: "integer";
                readonly description: "Maximum depth for recursive package traversal. Default: 5";
                readonly default: 5;
            };
            readonly include_descriptions: {
                readonly type: "boolean";
                readonly description: "Include object descriptions in response. Default: true";
                readonly default: true;
            };
            readonly debug: {
                readonly type: "boolean";
                readonly description: "Include diagnostic metadata in response (counts, types, hierarchy info). Default: false";
                readonly default: false;
            };
        };
        readonly required: readonly ["package_name"];
    };
};
interface GetPackageTreeArgs {
    package_name: string;
    include_subpackages?: boolean;
    max_depth?: number;
    include_descriptions?: boolean;
    debug?: boolean;
}
/**
 * Main handler for GetPackageTree MCP tool
 */
export declare function handleGetPackageTree(context: HandlerContext, args: GetPackageTreeArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetPackageTree.d.ts.map