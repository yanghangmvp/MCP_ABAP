/**
 * GetLocalDefinitions Handler - Read Local Definitions via AdtClient
 *
 * Uses AdtClient.getLocalDefinitions().read() for high-level read operation.
 * Local definitions are in the definitions include (private types).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetLocalDefinitions";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve local definitions source code from a class (definitions include). Supports reading active or inactive version.";
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
interface GetLocalDefinitionsArgs {
    class_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetLocalDefinitions(context: HandlerContext, args: GetLocalDefinitionsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetLocalDefinitions.d.ts.map