/**
 * UpdateStructure Handler - Update Existing ABAP Structure DDL Source
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive version) -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Update, Create. Subject: Structure. Will be useful for updating or creating structure. Update DDL source code of an existing ABAP structure. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., ZZ_S_TEST_001). Structure must already exist.";
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Complete DDL source code for structure. Example: '@EndUserText.label : \\'My Structure\\' @AbapCatalog.tableCategory : #TRANSPARENT define structure zz_s_test_001 { client : abap.clnt not null; id : abap.char(10); name : abap.char(255); }'";
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
        readonly required: readonly ["structure_name", "ddl_code"];
    };
};
interface UpdateStructureArgs {
    structure_name: string;
    ddl_code: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateStructure MCP tool
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleUpdateStructure(context: HandlerContext, args: UpdateStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateStructure.d.ts.map