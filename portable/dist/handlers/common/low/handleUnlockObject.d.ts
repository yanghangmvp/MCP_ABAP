/**
 * UnlockObject Handler - Unlock ABAP object after modification via ADT API
 *
 * Uses AdtClient unlock methods for specific object types.
 * Must reuse session_id and lock_handle from LockObject.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockObjectLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Unlock an ABAP object after modification. Requires the lock_handle from the LockObject operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name (e.g., ZCL_MY_CLASS, Z_MY_PROGRAM, ZIF_MY_INTERFACE). For function modules, use format GROUP|FM_NAME";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type";
                readonly enum: readonly ["class", "program", "interface", "function_group", "function_module", "table", "structure", "view", "domain", "data_element", "package", "behavior_definition", "metadata_extension"];
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockObject operation";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockObject operation. Must be the same session.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockObject (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["object_name", "object_type", "lock_handle"];
    };
};
interface UnlockObjectArgs {
    object_name: string;
    object_type: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleUnlockObject(context: HandlerContext, args: UnlockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockObject.d.ts.map