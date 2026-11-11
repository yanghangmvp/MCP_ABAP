import { type ServiceBindingVariant } from '@mcp-abap-adt/interfaces';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type ServiceBindingResponseFormat } from './serviceBindingPayloadUtils';
type DesiredPublicationStateInput = 'published' | 'unpublished' | 'unchanged';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Update, Create. Subject: ServiceBinding. Will be useful for updating or creating service binding. Update publication state of an existing ABAP service binding.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name to update.";
            };
            readonly desired_publication_state: {
                readonly type: "string";
                readonly enum: readonly ["published", "unpublished", "unchanged"];
                readonly description: "Target publication state.";
            };
            readonly binding_variant: {
                readonly type: "string";
                readonly enum: readonly ["ODATA_V2_UI", "ODATA_V2_WEB_API", "ODATA_V4_UI", "ODATA_V4_WEB_API"];
                readonly description: "Service binding variant. Determines OData version for publish/unpublish routing.";
                readonly default: "ODATA_V4_UI";
            };
            readonly service_name: {
                readonly type: "string";
                readonly description: "Published service name.";
            };
            readonly service_version: {
                readonly type: "string";
                readonly description: "Published service version. Optional.";
            };
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly default: "xml";
            };
        };
        readonly required: readonly ["service_binding_name", "desired_publication_state", "binding_variant", "service_name"];
    };
};
interface UpdateServiceBindingArgs {
    service_binding_name: string;
    desired_publication_state: DesiredPublicationStateInput;
    binding_variant?: ServiceBindingVariant;
    service_name: string;
    service_version?: string;
    response_format?: ServiceBindingResponseFormat;
}
export declare function handleUpdateServiceBinding(context: HandlerContext, args: UpdateServiceBindingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateServiceBinding.d.ts.map