import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type ServiceBindingResponseFormat } from './serviceBindingPayloadUtils';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete ABAP service binding via ADT Business Services endpoint.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name to delete.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Optional transport request for deletion transport flow.";
            };
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly default: "xml";
            };
        };
        readonly required: readonly ["service_binding_name"];
    };
};
interface DeleteServiceBindingArgs {
    service_binding_name: string;
    transport_request?: string;
    response_format?: ServiceBindingResponseFormat;
}
export declare function handleDeleteServiceBinding(context: HandlerContext, args: DeleteServiceBindingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteServiceBinding.d.ts.map