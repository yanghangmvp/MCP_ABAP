import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerProfileList";
    readonly available_in: readonly ["onprem"];
    readonly description: "Runtime profiling list. object_type: not used. Required: none. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly required: readonly [];
    };
};
export declare function handleHandlerProfileList(context: HandlerContext): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleHandlerProfileList.d.ts.map