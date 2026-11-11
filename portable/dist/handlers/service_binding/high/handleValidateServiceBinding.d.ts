import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidateServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Validate service binding parameters (name, service definition, package, version) via ADT validation endpoint.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name to validate.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description used during validation.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition linked to binding.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "ABAP package for the binding.";
            };
            readonly service_binding_version: {
                readonly type: "string";
                readonly description: "Service binding version (for example: 1.0).";
            };
        };
        readonly required: readonly ["service_binding_name", "service_definition_name"];
    };
};
interface ValidateServiceBindingArgs {
    service_binding_name: string;
    description?: string;
    service_definition_name?: string;
    package_name?: string;
    service_binding_version?: string;
}
export declare function handleValidateServiceBinding(context: HandlerContext, args: ValidateServiceBindingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidateServiceBinding.d.ts.map