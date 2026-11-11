import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerDumpList";
    readonly available_in: readonly ["onprem"];
    readonly description: "Runtime dump list. object_type: not used. Required: none. Optional: user, top, from, to. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly user: {
                readonly type: "string";
                readonly description: "Filter dumps by user.";
            };
            readonly top: {
                readonly type: "number";
                readonly description: "Limit number of returned dumps.";
            };
            readonly from: {
                readonly type: "string";
                readonly description: "Start of time range (YYYYMMDDHHMMSS).";
            };
            readonly to: {
                readonly type: "string";
                readonly description: "End of time range (YYYYMMDDHHMMSS).";
            };
        };
        readonly required: readonly [];
    };
};
type HandlerDumpListArgs = {
    user?: string;
    top?: number;
    from?: string;
    to?: string;
};
export declare function handleHandlerDumpList(context: HandlerContext, args: HandlerDumpListArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerDumpList.d.ts.map