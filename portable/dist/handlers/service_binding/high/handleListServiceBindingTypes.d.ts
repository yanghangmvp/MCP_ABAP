import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type ServiceBindingResponseFormat } from './serviceBindingPayloadUtils';
export declare const TOOL_DEFINITION: {
    readonly name: "ListServiceBindingTypes";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "List available service binding types (for example ODataV2/ODataV4) from ADT Business Services endpoint.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly default: "xml";
            };
        };
    };
};
interface ListServiceBindingTypesArgs {
    response_format?: ServiceBindingResponseFormat;
}
export declare function handleListServiceBindingTypes(context: HandlerContext, args?: ListServiceBindingTypesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleListServiceBindingTypes.d.ts.map