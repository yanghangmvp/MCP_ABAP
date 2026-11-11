/**
 * GetPackage Handler - Read ABAP Package via AdtClient
 *
 * Uses AdtClient.getPackage().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetPackage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP package metadata (description, super-package, etc.). Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., Z_MY_PACKAGE).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["package_name"];
    };
};
interface GetPackageArgs {
    package_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetPackage MCP tool
 *
 * Uses AdtClient.getPackage().read() - high-level read operation
 */
export declare function handleGetPackage(context: HandlerContext, args: GetPackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetPackage.d.ts.map