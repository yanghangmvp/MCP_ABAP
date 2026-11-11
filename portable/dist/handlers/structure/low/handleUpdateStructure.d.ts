/**
 * UpdateStructure Handler - Update ABAP Structure DDL Source
 *
 * Uses AdtClient.updateStructure from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateStructureLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Update DDL source code of an existing ABAP structure. Requires lock handle from LockObject. - use UpdateStructureSource for full workflow with lock/unlock.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., ZZ_S_TEST_001). Structure must already exist.";
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Complete DDL source code for the structure definition.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockObject. Required for update operation.";
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
        readonly required: readonly ["structure_name", "ddl_code", "lock_handle"];
    };
};
interface UpdateStructureArgs {
    structure_name: string;
    ddl_code: string;
    lock_handle: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UpdateStructure MCP tool
 *
 * Uses AdtClient.updateStructure - low-level single method call
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