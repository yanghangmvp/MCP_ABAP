import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeRunClassWithProfiling";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime][deprecated] Execute ABAP class with profiler enabled and return created profilerId + traceId. Prefer RuntimeRunClass with profile=true; this tool is kept for backward compatibility and will be removed in a future major release.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "ABAP class name to execute.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Profiler trace description.";
            };
            readonly all_procedural_units: {
                readonly type: "boolean";
            };
            readonly all_misc_abap_statements: {
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
            readonly max_trace_attempts: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly description: "Max polling attempts to resolve traceId after execution (default 5). Increase for slow systems (e.g. SAP trial cloud).";
            };
            readonly trace_retry_delay_ms: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly description: "Delay in ms between trace polling attempts (default 2000).";
            };
            readonly trace_lookup_uris: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly description: "Additional URIs to consult when resolving the trace (advanced).";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface RuntimeRunClassWithProfilingArgs {
    class_name: string;
    description?: string;
    all_procedural_units?: boolean;
    all_misc_abap_statements?: boolean;
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
    max_trace_attempts?: number;
    trace_retry_delay_ms?: number;
    trace_lookup_uris?: string[];
}
export declare function handleRuntimeRunClassWithProfiling(context: HandlerContext, args: RuntimeRunClassWithProfilingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeRunClassWithProfiling.d.ts.map