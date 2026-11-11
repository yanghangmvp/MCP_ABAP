import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeAnalyzeProfilerTrace";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] Read profiler trace view and return compact analysis summary (totals + top entries).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly trace_id_or_uri: {
                readonly type: "string";
                readonly description: "Profiler trace ID or full trace URI.";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["hitlist", "statements", "db_accesses"];
                readonly default: "hitlist";
            };
            readonly top: {
                readonly type: "number";
                readonly description: "Number of top rows for summary. Default: 10.";
            };
            readonly with_system_events: {
                readonly type: "boolean";
                readonly description: "Include system events.";
            };
        };
        readonly required: readonly ["trace_id_or_uri"];
    };
};
interface RuntimeAnalyzeProfilerTraceArgs {
    trace_id_or_uri: string;
    view?: 'hitlist' | 'statements' | 'db_accesses';
    top?: number;
    with_system_events?: boolean;
}
export declare function handleRuntimeAnalyzeProfilerTrace(context: HandlerContext, args: RuntimeAnalyzeProfilerTraceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeAnalyzeProfilerTrace.d.ts.map