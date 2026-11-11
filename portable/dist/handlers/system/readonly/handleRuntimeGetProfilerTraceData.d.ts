import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeGetProfilerTraceData";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] Read profiler trace data by trace id/uri: hitlist, statements, or db accesses. Returns parsed JSON payload.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly trace_id_or_uri: {
                readonly type: "string";
                readonly description: "Profiler trace ID or full ADT trace URI.";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["hitlist", "statements", "db_accesses"];
                readonly description: "Trace view to retrieve.";
            };
            readonly with_system_events: {
                readonly type: "boolean";
                readonly description: "Include system events.";
            };
            readonly id: {
                readonly type: "number";
                readonly description: "Statement node ID (for statements view).";
            };
            readonly with_details: {
                readonly type: "boolean";
                readonly description: "Include statement details (for statements view).";
            };
            readonly auto_drill_down_threshold: {
                readonly type: "number";
                readonly description: "Auto drill-down threshold (for statements view).";
            };
        };
        readonly required: readonly ["trace_id_or_uri", "view"];
    };
};
interface RuntimeGetProfilerTraceDataArgs {
    trace_id_or_uri: string;
    view: 'hitlist' | 'statements' | 'db_accesses';
    with_system_events?: boolean;
    id?: number;
    with_details?: boolean;
    auto_drill_down_threshold?: number;
}
export declare function handleRuntimeGetProfilerTraceData(context: HandlerContext, args: RuntimeGetProfilerTraceDataArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeGetProfilerTraceData.d.ts.map