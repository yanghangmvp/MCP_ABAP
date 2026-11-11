/**
 * UpdateInterface Handler - Update existing ABAP Interface source code
 *
 * Uses InterfaceBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateInterface";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Update, Create. Subject: Interface. Will be useful for updating or creating interface. Update source code of an existing ABAP interface. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., ZIF_MY_INTERFACE). Must exist in the system.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete ABAP interface source code with INTERFACE...ENDINTERFACE section.";
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
        readonly required: readonly ["interface_name", "source_code"];
    };
};
interface UpdateInterfaceArgs {
    interface_name: string;
    source_code: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateInterface MCP tool
 *
 * Uses InterfaceBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleUpdateInterface(context: HandlerContext, args: UpdateInterfaceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateInterface.d.ts.map