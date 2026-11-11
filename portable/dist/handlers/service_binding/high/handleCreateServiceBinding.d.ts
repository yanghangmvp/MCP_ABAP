import type { ServiceBindingVariant } from '@mcp-abap-adt/interfaces';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type ServiceBindingResponseFormat } from './serviceBindingPayloadUtils';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: ServiceBinding. Will be useful for creating service binding. Create a new ABAP service binding in SAP system. Creates the service binding object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Referenced service definition name.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "ABAP package name.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description. Defaults to service_binding_name when omitted.";
            };
            readonly binding_variant: {
                readonly type: "string";
                readonly enum: readonly ["ODATA_V2_UI", "ODATA_V2_WEB_API", "ODATA_V4_UI", "ODATA_V4_WEB_API"];
                readonly description: "Service binding variant. ODATA_V4_UI = OData V4 for Fiori Elements, ODATA_V4_WEB_API = OData V4 Web API, ODATA_V2_UI = OData V2 for Fiori Elements, ODATA_V2_WEB_API = OData V2 Web API.";
                readonly default: "ODATA_V4_UI";
            };
            readonly service_name: {
                readonly type: "string";
                readonly description: "Published service name. Default: service_binding_name if omitted.";
            };
            readonly service_version: {
                readonly type: "string";
                readonly description: "Published service version. Default: 0001.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Optional transport request for transport checks.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate service binding after create. Default: true.";
                readonly default: true;
            };
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly default: "xml";
            };
        };
        readonly required: readonly ["service_binding_name", "service_definition_name", "package_name"];
    };
};
interface CreateServiceBindingArgs {
    service_binding_name: string;
    service_definition_name: string;
    package_name: string;
    description?: string;
    binding_variant?: ServiceBindingVariant;
    service_name?: string;
    service_version?: string;
    transport_request?: string;
    activate?: boolean;
    response_format?: ServiceBindingResponseFormat;
}
export declare function handleCreateServiceBinding(context: HandlerContext, args: CreateServiceBindingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateServiceBinding.d.ts.map