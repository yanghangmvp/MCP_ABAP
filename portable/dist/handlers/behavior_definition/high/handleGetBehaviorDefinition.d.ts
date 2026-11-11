/**
 * GetBehaviorDefinition Handler - Read ABAP BehaviorDefinition via AdtClient
 *
 * Uses AdtClient.getBehaviorDefinition().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetBehaviorDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP behavior definition definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_definition_name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name (e.g., Z_MY_BEHAVIORDEFINITION).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["behavior_definition_name"];
    };
};
interface GetBehaviorDefinitionArgs {
    behavior_definition_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetBehaviorDefinition MCP tool
 *
 * Uses AdtClient.getBehaviorDefinition().read() - high-level read operation
 */
export declare function handleGetBehaviorDefinition(context: HandlerContext, args: GetBehaviorDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetBehaviorDefinition.d.ts.map