/**
 * CreateTransport Handler - Create ABAP Transport Request
 *
 * Uses AdtClient.createTransport from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateTransportLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP transport request.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly description: {
                readonly type: "string";
                readonly description: "Transport request description.";
            };
            readonly transport_type: {
                readonly type: "string";
                readonly description: "Transport type: 'workbench' or 'customizing' (optional, default: 'workbench').";
                readonly enum: readonly ["workbench", "customizing"];
            };
        };
        readonly required: readonly ["description"];
    };
};
interface CreateTransportArgs {
    description: string;
    transport_type?: 'workbench' | 'customizing';
}
/**
 * Main handler for CreateTransport MCP tool
 *
 * Uses AdtClient.createTransport - low-level single method call
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