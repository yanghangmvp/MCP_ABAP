/**
 * GetServiceDefinition Handler - Read ABAP ServiceDefinition via AdtClient
 *
 * Uses AdtClient.getServiceDefinition().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetServiceDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP service definition definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "ServiceDefinition name (e.g., Z_MY_SERVICEDEFINITION).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["service_definition_name"];
    };
};
interface GetServiceDefinitionArgs {
    service_definition_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetServiceDefinition MCP tool
 *
 * Uses AdtClient.getServiceDefinition().read() - high-level read operation
 */
export declare function handleGetServiceDefinition(context: HandlerContext, args: GetServiceDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetServiceDefinition.d.ts.map