/**
 * GetFixProposals Handler - list ABAP quick-fix proposals at a source position.
 *
 * These are the fixes behind an ATC finding's quickfix_info (and any editor
 * quick-fix). Mirrors abap-adt-api's fixProposals:
 *   POST /sap/bc/adt/quickfixes/evaluation?uri={objectUri}#start={line},{column}
 *   body: the current object source
 *   -> qf:evaluationResults / evaluationResult[] (each an objectReference to a
 *      quickfixes URI + opaque userContent)
 *
 * Read-only: evaluation computes proposals but never modifies the object. Feed a
 * returned proposal to GetFixEdits to compute the concrete source edit.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetFixProposals";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] List available ABAP quick-fix proposals at a source position — the fixes behind an ATC finding's quickfix_info, or any editor quick-fix. Provide the object SOURCE uri (e.g. /sap/bc/adt/oo/classes/zcl_x/source/main), the current full source, and the line/column of the position. Returns proposals; pass one (proposal_adt_uri + user_content) to GetFixEdits to compute the concrete edit. Does not modify the object.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_uri: {
                readonly type: "string";
                readonly description: "ADT source URI of the object, e.g. /sap/bc/adt/oo/classes/zcl_foo/source/main or /sap/bc/adt/programs/programs/zfoo/source/main.";
            };
            readonly source: {
                readonly type: "string";
                readonly description: "Current full source of the object (as returned by the matching Get*/Read* tool).";
            };
            readonly line: {
                readonly type: "number";
                readonly description: "Line of the position to evaluate (1-based).";
            };
            readonly column: {
                readonly type: "number";
                readonly description: "Column of the position (0-based).";
            };
        };
        readonly required: readonly ["object_uri", "source", "line", "column"];
    };
};
interface GetFixProposalsArgs {
    object_uri: string;
    source: string;
    line: number;
    column: number;
}
export declare function handleGetFixProposals(context: HandlerContext, args: GetFixProposalsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetFixProposals.d.ts.map