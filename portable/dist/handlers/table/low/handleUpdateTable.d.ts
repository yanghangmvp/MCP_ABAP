/**
 * UpdateTable Handler - Update ABAP Table DDL Source
 *
 * Uses AdtClient.updateTable from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateTableLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Update DDL source code of an existing ABAP table. Requires lock handle from LockObject. - use CreateTable for full workflow with lock/unlock.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZOK_T_TEST_0001). Table must already exist.";
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Complete DDL source code for the table definition.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockObject. Required for update operation.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                    };
                };
            };
        };
        readonly required: readonly ["table_name", "ddl_code", "lock_handle"];
    };
};
interface UpdateTableArgs {
    table_name: string;
    ddl_code: string;
    lock_handle: string;
    transport_request?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UpdateTable MCP tool
 *
 * Uses AdtClient.updateTable - low-level single method call
 */
export declare function handleUpdateTable(context: HandlerContext, args: UpdateTableArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateTable.d.ts.map