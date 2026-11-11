/**
 * GetBehaviorImplementation Handler - Read ABAP BehaviorImplementation via AdtClient
 *
 * Uses AdtClient.getBehaviorImplementation().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetBehaviorImplementation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP behavior implementation definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_implementation_name: {
                readonly type: "string";
                readonly description: "BehaviorImplementation name (e.g., Z_MY_BEHAVIORIMPLEMENTATION).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["behavior_implementation_name"];
    };
};
interface GetBehaviorImplementationArgs {
    behavior_implementation_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetBehaviorImplementation MCP tool
 *
 * Uses AdtClient.getBehaviorImplementation().read() - high-level read operation
 */
export declare function handleGetBehaviorImplementation(context: HandlerContext, args: GetBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetBehaviorImplementation.d.ts.map