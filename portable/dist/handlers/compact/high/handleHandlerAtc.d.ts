import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerAtc";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "ATC. operation='run' (needs object_name + object_type) | 'worklist' (needs worklist_id) | 'customizing'. Optional: check_variant, max_priority, summary. Response: JSON findings.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly operation: {
                readonly type: "string";
                readonly enum: readonly ["run", "worklist", "customizing"];
                readonly description: "'run' executes a check; 'worklist' re-reads a previous run by id; 'customizing' reports the system's ATC configuration.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "For operation='run'.";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "For operation='run', e.g. 'package', 'class'.";
            };
            readonly check_variant: {
                readonly type: "string";
                readonly description: "Check variant name. Verified against SCICHKV_HD; an unknown name is refused rather than silently replaced by DEFAULT.";
            };
            readonly max_priority: {
                readonly type: "number";
                readonly description: "Highest priority to report.";
            };
            readonly summary: {
                readonly type: "boolean";
                readonly description: "Counts only.";
            };
            readonly worklist_id: {
                readonly type: "string";
                readonly description: "Required for operation='worklist'.";
            };
        };
        readonly required: readonly ["operation"];
    };
};
type HandlerAtcArgs = {
    operation?: string;
    object_name?: string;
    object_type?: string;
    check_variant?: string;
    max_priority?: number;
    summary?: boolean;
    worklist_id?: string;
};
export declare function handleHandlerAtc(context: HandlerContext, args: HandlerAtcArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerAtc.d.ts.map