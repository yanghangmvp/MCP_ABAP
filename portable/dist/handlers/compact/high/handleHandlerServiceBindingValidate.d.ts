import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerServiceBindingValidate";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Service binding validate before create. object_type: not used. Required: service_binding_name*, service_definition_name*. Optional: service_binding_version, package_name, description. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name to validate.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition name to pair with binding.";
            };
            readonly service_binding_version: {
                readonly type: "string";
                readonly description: "Service binding version.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Target package name.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Binding description.";
            };
        };
        readonly required: readonly ["service_binding_name", "service_definition_name"];
    };
};
type HandlerServiceBindingValidateArgs = {
    service_binding_name: string;
    service_definition_name: string;
    service_binding_version?: string;
    package_name?: string;
    description?: string;
};
export declare function handleHandlerServiceBindingValidate(context: HandlerContext, args: HandlerServiceBindingValidateArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerServiceBindingValidate.d.ts.map