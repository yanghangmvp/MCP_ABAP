/**
 * DeleteServiceDefinition Handler - Delete ABAP ServiceDefinition via AdtClient
 *
 * Uses AdtClient.getServiceDefinition().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteServiceDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP service definition from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "ServiceDefinition name (e.g., Z_MY_SERVICEDEFINITION).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["service_definition_name"];
    };
};
interface DeleteServiceDefinitionArgs {
    service_definition_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteServiceDefinition MCP tool
 *
 * Uses AdtClient.getServiceDefinition().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteServiceDefinition(context: HandlerContext, args: DeleteServiceDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteServiceDefinition.d.ts.map