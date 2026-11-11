/**
 * UnlockProgram Handler - Unlock ABAP Program
 *
 * Uses AdtClient.unlockProgram from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockProgramLow";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "[low-level] Unlock an ABAP program after modification. Requires the lock_handle from LockProgram operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., Z_MY_PROGRAM).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockProgram operation.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockProgram operation. Must be the same as used in LockProgram.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockProgram (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["program_name", "lock_handle"];
    };
};
interface UnlockProgramArgs {
    program_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockProgram MCP tool
 *
 * Uses AdtClient.unlockProgram - low-level single method call
 */
export declare function handleUnlockProgram(context: HandlerContext, args: UnlockProgramArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockProgram.d.ts.map