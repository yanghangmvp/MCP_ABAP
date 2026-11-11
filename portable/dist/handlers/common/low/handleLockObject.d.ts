/**
 * LockObject Handler - Lock ABAP object for modification via ADT API
 *
 * Uses AdtClient lock methods for specific object types.
 * Returns lock handle that must be reused with the same session.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "LockObjectLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Lock an ABAP object for modification. Returns lock handle that must be used in subsequent update/unlock operations with the same session_id.";
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
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package (required for package locking)";
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
        readonly required: readonly ["object_name", "object_type"];
    };
};
interface LockObjectArgs {
    object_name: string;
    object_type: string;
    super_package?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleLockObject(context: HandlerContext, args: LockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleLockObject.d.ts.map