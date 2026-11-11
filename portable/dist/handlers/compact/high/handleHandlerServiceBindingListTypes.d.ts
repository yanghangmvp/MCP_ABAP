import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerServiceBindingListTypes";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Service binding types list. object_type: not used. Required: none. Optional: response_format(xml|json|plain). Response: XML/JSON/plain by response_format.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly default: "xml";
                readonly description: "Response format for protocol types list.";
            };
        };
        readonly required: readonly [];
    };
};
type HandlerServiceBindingListTypesArgs = {
    response_format?: 'xml' | 'json' | 'plain';
};
export declare function handleHandlerServiceBindingListTypes(context: HandlerContext, args: HandlerServiceBindingListTypesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerServiceBindingListTypes.d.ts.map