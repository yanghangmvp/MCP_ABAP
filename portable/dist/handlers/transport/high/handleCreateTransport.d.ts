/**
 * CreateTransport Handler - Create new ABAP transport request via ADT API
 *
 * Uses TransportBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: create
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateTransport";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Create a new ABAP transport request in SAP system for development objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_type: {
                readonly type: "string";
                readonly description: "Transport type: 'workbench' (cross-client) or 'customizing' (client-specific)";
                readonly enum: readonly ["workbench", "customizing"];
                readonly default: "workbench";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Transport request description (mandatory)";
            };
            readonly target_system: {
                readonly type: "string";
                readonly description: "Target system for transport (optional, e.g., 'PRD', 'QAS'). If not provided or empty, uses 'LOCAL'";
            };
            readonly owner: {
                readonly type: "string";
                readonly description: "Transport owner (optional, defaults to current user)";
            };
        };
        readonly required: readonly ["description"];
    };
};
interface CreateTransportArgs {
    transport_type?: string;
    description: string;
    target_system?: string;
    owner?: string;
}
/**
 * Main handler for CreateTransport MCP tool
 *
 * Uses TransportBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreateTransport(context: HandlerContext, args: CreateTransportArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateTransport.d.ts.map