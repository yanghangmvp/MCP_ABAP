/**
 * CheckObject Handler - Syntax check for ABAP objects via ADT API.
 *
 * Dispatches on object_type to an ADT URI and runs the check through the shared
 * `checkObjectAndReport` (see it for why none of these go through the
 * dependency's per-type check() wrappers any more).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckObjectLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Perform syntax check on an ABAP object without activation. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name (e.g., ZCL_MY_CLASS, Z_MY_PROGRAM)";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type";
                readonly enum: readonly ["class", "program", "interface", "function_group", "table", "structure", "view", "domain", "data_element", "behavior_definition", "metadata_extension"];
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to check: 'active' or 'inactive' (default active)";
                readonly enum: readonly ["active", "inactive"];
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
interface CheckObjectArgs {
    object_name: string;
    object_type: string;
    version?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleCheckObject(context: HandlerContext, args: CheckObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckObject.d.ts.map