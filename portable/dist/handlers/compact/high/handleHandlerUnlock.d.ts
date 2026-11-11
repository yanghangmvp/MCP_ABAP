import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerUnlock";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Unlock operation. object_type required: CLASS(object_name*, lock_handle*, session_id*), PROGRAM(object_name*, lock_handle*, session_id*), INTERFACE(object_name*, lock_handle*, session_id*), FUNCTION_GROUP(object_name*, lock_handle*, session_id*), FUNCTION_MODULE(object_name*, lock_handle*, session_id*), TABLE(object_name*, lock_handle*, session_id*), STRUCTURE(object_name*, lock_handle*, session_id*), VIEW(object_name*, lock_handle*, session_id*), DOMAIN(object_name*, lock_handle*, session_id*), DATA_ELEMENT(object_name*, lock_handle*, session_id*), PACKAGE(object_name*, lock_handle*, session_id*), BEHAVIOR_DEFINITION(object_name*, lock_handle*, session_id*), BEHAVIOR_IMPLEMENTATION(object_name*, lock_handle*, session_id*), METADATA_EXTENSION(object_name*, lock_handle*, session_id*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle returned by lock.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "ADT session id used during lock.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Optional ADT session state container (cookies/CSRF) for stateful unlock flow.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                        readonly description: "Serialized Cookie header to reuse server session.";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                        readonly description: "CSRF token to reuse server session.";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                        readonly description: "Cookie key/value map to reuse server session.";
                    };
                };
            };
            readonly object_type: {
                readonly type: "string";
                readonly enum: CompactObjectType[];
                readonly description: "ABAP object type for routed compact operation.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Primary object name for lifecycle operation.";
            };
        };
        readonly required: readonly ["object_type", "object_name", "lock_handle", "session_id"];
    };
};
type HandlerUnlockArgs = {
    object_type: CompactObjectType;
    object_name: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
};
export declare function handleHandlerUnlock(context: HandlerContext, args: HandlerUnlockArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerUnlock.d.ts.map