import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeGetDumpById";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] Read a specific ABAP runtime dump by its ID. First use RuntimeListFeeds to find dumps and get their IDs, then pass dump_id here to read the full dump content.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly dump_id: {
                readonly type: "string";
                readonly description: "Full runtime dump ID (e.g. from RuntimeListFeeds).";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["default", "summary", "formatted"];
                readonly description: "Dump view mode: default payload, summary section, or formatted long text.";
                readonly default: "default";
            };
            readonly response_mode: {
                readonly type: "string";
                readonly enum: readonly ["payload", "summary", "both"];
                readonly description: "Controls what is returned: \"payload\" — full parsed dump data, \"summary\" — compact key facts only (title, exception, program, line, user, date…), \"both\" — summary + full payload.";
                readonly default: "both";
            };
        };
        readonly required: readonly ["dump_id"];
    };
};
interface RuntimeGetDumpByIdArgs {
    dump_id: string;
    view?: 'default' | 'summary' | 'formatted';
    response_mode?: 'payload' | 'summary' | 'both';
}
export declare function handleRuntimeGetDumpById(context: HandlerContext, args: RuntimeGetDumpByIdArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeGetDumpById.d.ts.map