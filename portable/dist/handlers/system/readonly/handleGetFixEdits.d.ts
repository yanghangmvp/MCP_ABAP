/**
 * GetFixEdits Handler - compute the concrete source edits for a quick-fix
 * proposal returned by GetFixProposals, WITHOUT applying them.
 *
 * Mirrors abap-adt-api's fixEdits:
 *   POST {proposal_adt_uri}   (a /sap/bc/adt/quickfixes/... URI)
 *   body: <quickfixes:proposalRequest> with the current source + objectReference
 *   -> qf:proposalResult / deltas / unit[] (each: target object + new content)
 *
 * Read-only: it returns the text deltas (target object, range, new content) so
 * they can be reviewed and then written back with the matching Update tool. It
 * does not modify anything on the server.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetFixEdits";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Compute the concrete source edits for a quick-fix proposal from GetFixProposals, without applying them. Pass the proposal_adt_uri and user_content from GetFixProposals plus the object_uri, line, column and current source. Returns the text deltas (target object uri, range, new content) — review them and write back with the matching Update tool. Does not modify the object.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly proposal_adt_uri: {
                readonly type: "string";
                readonly description: "The proposal_adt_uri from GetFixProposals (a /sap/bc/adt/quickfixes/... URI).";
            };
            readonly object_uri: {
                readonly type: "string";
                readonly description: "ADT source URI of the object being fixed (same as passed to GetFixProposals).";
            };
            readonly line: {
                readonly type: "number";
                readonly description: "Line of the position (1-based).";
            };
            readonly column: {
                readonly type: "number";
                readonly description: "Column of the position (0-based).";
            };
            readonly source: {
                readonly type: "string";
                readonly description: "Current full source of the object.";
            };
            readonly user_content: {
                readonly type: "string";
                readonly description: "(optional) The opaque user_content from the chosen GetFixProposals proposal.";
            };
        };
        readonly required: readonly ["proposal_adt_uri", "object_uri", "line", "column", "source"];
    };
};
interface GetFixEditsArgs {
    proposal_adt_uri: string;
    object_uri: string;
    line: number;
    column: number;
    source: string;
    user_content?: string;
}
export declare function handleGetFixEdits(context: HandlerContext, args: GetFixEditsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetFixEdits.d.ts.map