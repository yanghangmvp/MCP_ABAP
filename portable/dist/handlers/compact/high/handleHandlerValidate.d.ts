import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerValidate";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Validate before create only. object_type required: CLASS(object_name*), PROGRAM(object_name*), INTERFACE(object_name*), FUNCTION_GROUP(object_name*), FUNCTION_MODULE(object_name*), TABLE(object_name*), STRUCTURE(object_name*), VIEW(object_name*), DOMAIN(object_name*), DATA_ELEMENT(object_name*), PACKAGE(object_name*), BEHAVIOR_DEFINITION(object_name*), BEHAVIOR_IMPLEMENTATION(object_name*), METADATA_EXTENSION(object_name*), SERVICE_BINDING(object_name*=service_binding_name*, service_definition_name*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly enum: readonly ["CLASS", "PROGRAM", "INTERFACE", "FUNCTION_GROUP", "FUNCTION_MODULE", "TABLE", "STRUCTURE", "VIEW", "DOMAIN", "DATA_ELEMENT", "PACKAGE", "BEHAVIOR_DEFINITION", "BEHAVIOR_IMPLEMENTATION", "METADATA_EXTENSION", "SERVICE_BINDING"];
                readonly description: "Object type to validate before create. Supported: CLASS, PROGRAM, INTERFACE, FUNCTION_GROUP, FUNCTION_MODULE, TABLE, STRUCTURE, VIEW, DOMAIN, DATA_ELEMENT, PACKAGE, BEHAVIOR_DEFINITION, BEHAVIOR_IMPLEMENTATION, METADATA_EXTENSION, SERVICE_BINDING.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Required object name. For SERVICE_BINDING this is the service binding name.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Optional package context for validation (especially for create scenarios).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional object description used during validation.";
            };
            readonly behavior_definition: {
                readonly type: "string";
                readonly description: "Optional behavior definition name, used when validating behavior implementation.";
            };
            readonly root_entity: {
                readonly type: "string";
                readonly description: "Optional CDS root entity name, used for behavior-related validation.";
            };
            readonly implementation_type: {
                readonly type: "string";
                readonly description: "Optional implementation type, used for behavior implementation validation.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Required when object_type=SERVICE_BINDING. Service definition paired with the binding.";
            };
            readonly service_binding_version: {
                readonly type: "string";
                readonly description: "Optional service binding version for SERVICE_BINDING.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Optional ADT session id for stateful validation flow.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Optional ADT session state container (cookies/CSRF) for stateful validation flow.";
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
        };
        readonly required: readonly ["object_type", "object_name"];
    };
};
type HandlerValidateArgs = {
    object_type: CompactObjectType;
    object_name: string;
    package_name?: string;
    description?: string;
    behavior_definition?: string;
    root_entity?: string;
    implementation_type?: string;
    service_definition_name?: string;
    service_binding_version?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
};
export declare function handleHandlerValidate(context: HandlerContext, args: HandlerValidateArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerValidate.d.ts.map