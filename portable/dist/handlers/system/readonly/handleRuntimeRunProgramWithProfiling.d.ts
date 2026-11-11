import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeRunProgramWithProfiling";
    readonly available_in: readonly ["onprem"];
    readonly description: "[runtime][deprecated] Execute ABAP program with profiler enabled and return created profilerId. Prefer RuntimeRunProgram with profile=true; this tool is kept for backward compatibility and will be removed in a future major release.";
    readonly notes: "SELECTION-SCREEN PARAMETERS ARE NOT SUPPORTED, and that is the endpoint's\nlimit, not an omission here. Measured on S/4HANA 2023 FPS02:\n\n  - Discovery advertises exactly one query parameter:\n    /sap/bc/adt/programs/programrun/{programname}{?profilerId}. There is no\n    parameter, select-option or variant in the template.\n  - An unknown query parameter is not ignored on the synchronous endpoint — it\n    answers HTTP 500 with an ICF error page.\n  - The background variant, POST /programs/programrun/job/{programname}, DOES run\n    the report (verified: a job appears in TBTCO and reaches status F). But it\n    accepts a nonexistent variant, ?variant=ZZ_NO_SUCH_VARIANT, with HTTP 200 and\n    an empty body, and ignores a selection body the same way. It validates only\n    the program name (a wrong one is a 404). So a variant passed there is\n    SILENTLY DISCARDED and the report runs with its default selection values.\n\nA `parameters` / `select_options` / `variant` argument is therefore deliberately\nNOT offered: it could only ever be an argument that looks accepted and does\nnothing.\n\nWHAT TO DO INSTEAD (contributed by a reporting project that runs a parameterised\nreport writing to the live Dictionary). Wrap it:\n\n    REPORT zmy_tmp_apply.\n    SUBMIT zmy_real_report WITH p_commit = abap_true\n                           WITH p_dtel   = abap_true\n                           AND RETURN.\n\nthen RuntimeRunProgram the wrapper and DeleteProgram it. Two cautions, neither\nobvious, both worth the line:\n\n  - Put the wrapper in $TMP. No transport, and no TADIR entry to clean out of a\n    customer package afterwards — otherwise removing it needs a deletion marker\n    transported.\n  - Do NOT flip the real report's own DEFAULT values instead. That is the\n    tempting one-liner, and it leaves a report that writes to the live\n    Dictionary the moment anyone runs it with no arguments.\n\nThe program runs with its DEFAULT selection-screen values. A report with a\nMANDATORY parameter will therefore fail; the ICF error page it produces is\nreduced to its message by describeSapErrorPage.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "ABAP program name to execute.";
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
        };
        readonly required: readonly ["program_name"];
    };
};
interface RuntimeRunProgramWithProfilingArgs {
    program_name: string;
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
}
export declare function handleRuntimeRunProgramWithProfiling(context: HandlerContext, args: RuntimeRunProgramWithProfilingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeRunProgramWithProfiling.d.ts.map