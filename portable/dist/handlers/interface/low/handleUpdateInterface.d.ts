/**
 * UpdateInterface Handler - Update ABAP Interface Source Code
 *
 * Uses AdtClient.updateInterface from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateInterfaceLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Update source code of an existing ABAP interface. Requires lock handle from LockObject. - use UpdateInterface (high-level) for full workflow with lock/unlock/activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., ZIF_TEST_INTERFACE). Interface must already exist.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete ABAP interface source code.";
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
        readonly required: readonly ["interface_name", "source_code", "lock_handle"];
    };
};
interface UpdateInterfaceArgs {
    interface_name: string;
    source_code: string;
    lock_handle: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UpdateInterface MCP tool
 *
 * Uses AdtClient.updateInterface - low-level single method call
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