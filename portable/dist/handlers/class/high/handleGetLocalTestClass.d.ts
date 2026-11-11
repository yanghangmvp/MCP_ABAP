/**
 * GetLocalTestClass Handler - Read Local Test Class via AdtClient
 *
 * Uses AdtClient.getLocalTestClass().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetLocalTestClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve local test class source code from a class. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface GetLocalTestClassArgs {
    class_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetLocalTestClass MCP tool
 *
 * Uses AdtClient.getLocalTestClass().read() - high-level read operation
 */
export declare function handleGetLocalTestClass(context: HandlerContext, args: GetLocalTestClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetLocalTestClass.d.ts.map