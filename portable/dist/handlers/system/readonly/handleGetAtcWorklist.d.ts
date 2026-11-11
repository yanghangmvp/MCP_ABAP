/**
 * GetAtcWorklist Handler - Re-read the findings of an existing ATC worklist
 * (created by a previous RunAtc) without re-running the checks.
 * Mirrors abap-adt-api's atcWorklists.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAtcWorklist";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Re-read the findings of an existing ATC worklist by worklist_id (returned by RunAtc) without re-running the checks. Useful to re-inspect results or include exempted findings.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly worklist_id: {
                readonly type: "string";
                readonly description: "Worklist ID returned by a previous RunAtc call.";
            };
            readonly timestamp: {
                readonly type: "string";
                readonly description: "Optional worklist timestamp (from RunAtc worklist_timestamp) to pin the result set.";
            };
            readonly used_object_set: {
                readonly type: "string";
                readonly description: "Optional object-set id to filter by (e.g. the PACKAGE set id from the worklist).";
            };
            readonly include_exempted: {
                readonly type: "boolean";
                readonly description: "Include exempted findings. Default: false.";
            };
        };
        readonly required: readonly ["worklist_id"];
    };
};
interface GetAtcWorklistArgs {
    worklist_id: string;
    timestamp?: string;
    used_object_set?: string;
    include_exempted?: boolean;
}
export declare function handleGetAtcWorklist(context: HandlerContext, args: GetAtcWorklistArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetAtcWorklist.d.ts.map