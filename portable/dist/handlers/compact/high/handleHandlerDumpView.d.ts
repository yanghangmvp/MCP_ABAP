import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerDumpView";
    readonly available_in: readonly ["onprem"];
    readonly description: "Runtime dump view. object_type: not used. Required: dump_id*. Optional: view(default|summary|formatted). Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly dump_id: {
                readonly type: "string";
                readonly description: "Runtime dump id.";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["default", "summary", "formatted"];
                readonly default: "default";
                readonly description: "Dump rendering mode.";
            };
        };
        readonly required: readonly ["dump_id"];
    };
};
type HandlerDumpViewArgs = {
    dump_id: string;
    view?: 'default' | 'summary' | 'formatted';
};
export declare function handleHandlerDumpView(context: HandlerContext, args: HandlerDumpViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerDumpView.d.ts.map