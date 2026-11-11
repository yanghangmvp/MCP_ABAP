/**
 * GetClass Handler - Read ABAP Class via AdtClient
 *
 * Uses AdtClient.getClass().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP class source code. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
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
interface GetClassArgs {
    class_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetClass MCP tool
 *
 * Uses AdtClient.getClass().read() - high-level read operation
 */
export declare function handleGetClass(context: HandlerContext, args: GetClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetClass.d.ts.map