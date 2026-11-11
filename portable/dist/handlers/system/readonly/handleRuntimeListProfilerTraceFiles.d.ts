import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeListProfilerTraceFiles";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] List ABAP profiler trace files available in ADT runtime. Returns parsed JSON payload.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly required: readonly [];
    };
};
export declare function handleRuntimeListProfilerTraceFiles(context: HandlerContext): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleRuntimeListProfilerTraceFiles.d.ts.map