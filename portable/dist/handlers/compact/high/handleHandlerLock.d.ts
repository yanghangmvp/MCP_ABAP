import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerLock";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Lock operation. object_type required: CLASS(object_name*), PROGRAM(object_name*), INTERFACE(object_name*), FUNCTION_GROUP(object_name*), FUNCTION_MODULE(object_name*), TABLE(object_name*), STRUCTURE(object_name*), VIEW(object_name*), DOMAIN(object_name*), DATA_ELEMENT(object_name*), PACKAGE(object_name*), BEHAVIOR_DEFINITION(object_name*), BEHAVIOR_IMPLEMENTATION(object_name*), METADATA_EXTENSION(object_name*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package context when relevant.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Optional ADT session id for stateful lock flow.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Optional ADT session state container (cookies/CSRF) for stateful lock flow.";
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
        readonly required: readonly ["object_type", "object_name"];
    };
};
type HandlerLockArgs = {
    object_type: CompactObjectType;
    object_name: string;
    super_package?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
};
export declare function handleHandlerLock(context: HandlerContext, args: HandlerLockArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerLock.d.ts.map