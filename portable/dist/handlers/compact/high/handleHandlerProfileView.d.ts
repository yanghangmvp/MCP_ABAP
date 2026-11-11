import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerProfileView";
    readonly available_in: readonly ["onprem"];
    readonly description: "Runtime profiling view. object_type: not used. Required: trace_id_or_uri*, view*(hitlist|statements|db_accesses). Optional: with_system_events, id, with_details, auto_drill_down_threshold. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly trace_id_or_uri: {
                readonly type: "string";
                readonly description: "Profiler trace id or URI.";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["hitlist", "statements", "db_accesses"];
                readonly description: "Profiler trace view kind.";
            };
            readonly with_system_events: {
                readonly type: "boolean";
                readonly description: "Include system events in analysis.";
            };
            readonly id: {
                readonly type: "number";
                readonly description: "Optional statement/access id.";
            };
            readonly with_details: {
                readonly type: "boolean";
                readonly description: "Include detailed payload.";
            };
            readonly auto_drill_down_threshold: {
                readonly type: "number";
                readonly description: "Auto drill-down threshold.";
            };
        };
        readonly required: readonly ["trace_id_or_uri", "view"];
    };
};
type HandlerProfileViewArgs = {
    trace_id_or_uri: string;
    view: 'hitlist' | 'statements' | 'db_accesses';
    with_system_events?: boolean;
    id?: number;
    with_details?: boolean;
    auto_drill_down_threshold?: number;
};
export declare function handleHandlerProfileView(context: HandlerContext, args: HandlerProfileViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerProfileView.d.ts.map