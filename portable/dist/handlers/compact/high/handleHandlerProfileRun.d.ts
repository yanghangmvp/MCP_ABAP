import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerProfileRun";
    readonly available_in: readonly ["onprem"];
    readonly description: "Runtime profiling run. object_type: not used. Required: target_type*(CLASS|PROGRAM) + class_name* for CLASS or program_name* for PROGRAM. Optional profiling flags and description. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly target_type: {
                readonly type: "string";
                readonly enum: readonly ["CLASS", "PROGRAM"];
                readonly description: "Profile execution target kind.";
            };
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name for profiling.";
            };
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name for profiling.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Profiler run description.";
            };
            readonly all_procedural_units: {
                readonly type: "boolean";
                readonly description: "Trace all procedural units.";
            };
            readonly all_misc_abap_statements: {
                readonly type: "boolean";
                readonly description: "Trace miscellaneous ABAP statements.";
            };
            readonly all_internal_table_events: {
                readonly type: "boolean";
                readonly description: "Trace internal table events.";
            };
            readonly all_dynpro_events: {
                readonly type: "boolean";
                readonly description: "Trace dynpro events.";
            };
            readonly aggregate: {
                readonly type: "boolean";
                readonly description: "Aggregate profiling data.";
            };
            readonly explicit_on_off: {
                readonly type: "boolean";
                readonly description: "Use explicit on/off trace sections.";
            };
            readonly with_rfc_tracing: {
                readonly type: "boolean";
                readonly description: "Enable RFC tracing.";
            };
            readonly all_system_kernel_events: {
                readonly type: "boolean";
                readonly description: "Trace system kernel events.";
            };
            readonly sql_trace: {
                readonly type: "boolean";
                readonly description: "Enable SQL trace.";
            };
            readonly all_db_events: {
                readonly type: "boolean";
                readonly description: "Trace all DB events.";
            };
            readonly max_size_for_trace_file: {
                readonly type: "number";
                readonly description: "Maximum trace file size.";
            };
            readonly amdp_trace: {
                readonly type: "boolean";
                readonly description: "Enable AMDP tracing.";
            };
            readonly max_time_for_tracing: {
                readonly type: "number";
                readonly description: "Maximum tracing time.";
            };
        };
        readonly required: readonly ["target_type"];
    };
};
type HandlerProfileRunArgs = {
    target_type: 'CLASS' | 'PROGRAM';
    class_name?: string;
    program_name?: string;
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
};
export declare function handleHandlerProfileRun(context: HandlerContext, args: HandlerProfileRunArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerProfileRun.d.ts.map