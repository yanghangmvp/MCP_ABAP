import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeRunClass";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] Execute an ABAP class implementing if_oo_adt_classrun and return its output. Set profile=true to also capture a profiler trace (returns profilerId/traceId alongside output).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "ABAP class name to execute.";
            };
            readonly profile: {
                readonly type: "boolean";
                readonly description: "When true, run with the profiler and resolve the resulting traceId. Default false.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Profiler trace description (only used when profile=true).";
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
                readonly description: "Max polling attempts to resolve traceId after execution (default 5). Only used when profile=true.";
            };
            readonly trace_retry_delay_ms: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly description: "Delay in ms between trace polling attempts (default 2000). Only used when profile=true.";
            };
            readonly trace_lookup_uris: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly description: "Additional URIs to consult when resolving the trace (advanced, profile=true).";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface RuntimeRunClassArgs {
    class_name: string;
    profile?: boolean;
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
export declare function handleRuntimeRunClass(context: HandlerContext, args: RuntimeRunClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeRunClass.d.ts.map