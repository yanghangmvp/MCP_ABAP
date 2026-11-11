import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeCreateProfilerTraceParameters";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] Create ABAP profiler trace parameters and return profilerId (URI) for profiled execution.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly description: {
                readonly type: "string";
                readonly description: "Human-readable trace description.";
            };
            readonly all_misc_abap_statements: {
                readonly type: "boolean";
            };
            readonly all_procedural_units: {
                readonly type: "boolean";
            };
            readonly all_internal_table_events: {
                readonly type: "boolean";
            };
            readonly all_dynpro_events: {
                readonly type: "boolean";
            };
            readonly aggregate: {
                readonly type: "boolean";
            };
            readonly explicit_on_off: {
                readonly type: "boolean";
            };
            readonly with_rfc_tracing: {
                readonly type: "boolean";
            };
            readonly all_system_kernel_events: {
                readonly type: "boolean";
            };
            readonly sql_trace: {
                readonly type: "boolean";
            };
            readonly all_db_events: {
                readonly type: "boolean";
            };
            readonly max_size_for_trace_file: {
                readonly type: "number";
            };
            readonly amdp_trace: {
                readonly type: "boolean";
            };
            readonly max_time_for_tracing: {
                readonly type: "number";
            };
        };
        readonly required: readonly ["description"];
    };
};
interface RuntimeCreateProfilerTraceParametersArgs {
    description: string;
    all_misc_abap_statements?: boolean;
    all_procedural_units?: boolean;
    all_internal_table_events?: boolean;
    all_dynpro_events?: boolean;
    aggregate?: boolean;
    explicit_on_off?: boolean;
    with_rfc_tracing?: boolean;
    all_system_kernel_events?: boolean;
    sql_trace?: boolean;
    all_db_events?: boolean;
    max_size_for_trace_file?: number;
    amdp_trace?: boolean;
    max_time_for_tracing?: number;
}
export declare function handleRuntimeCreateProfilerTraceParameters(context: HandlerContext, args: RuntimeCreateProfilerTraceParametersArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeCreateProfilerTraceParameters.d.ts.map