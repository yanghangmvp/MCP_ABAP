/**
 * UpdateServiceDefinition Handler - Update Existing ABAP Service Definition Source
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateServiceDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Update, Create. Subject: ServiceDefinition. Will be useful for updating or creating service definition. Update source code of an existing ABAP service definition. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition name (e.g., ZSD_MY_SERVICE). Must exist in the system.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete service definition source code.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["service_definition_name", "source_code"];
    };
};
interface UpdateServiceDefinitionArgs {
    service_definition_name: string;
    source_code: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateServiceDefinition MCP tool
 *
 * Uses AdtClient for all operations
 * Session and lock management handled internally by client
 */
export declare function handleUpdateServiceDefinition(context: HandlerContext, args: UpdateServiceDefinitionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateServiceDefinition.d.ts.map