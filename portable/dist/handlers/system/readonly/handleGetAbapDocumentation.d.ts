/**
 * GetAbapDocumentation Handler - fetch ABAP language/keyword documentation for a
 * position in source.
 *
 * Mirrors abap-adt-api's abapDocumentation:
 *   POST /sap/bc/adt/docu/abap/langu?uri={objectUri}#start={line},{column}
 *        &language={EN}&format=eclipse
 *   Content-Type: text/plain (the current source), Accept: html
 *   -> HTML documentation for the keyword/element at that position.
 *
 * Read-only.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAbapDocumentation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Fetch ABAP keyword/element documentation for a position in source. Provide the object SOURCE uri (e.g. /sap/bc/adt/oo/classes/zcl_x/source/main), the current full source, and the line/column of the token. Returns the documentation as HTML. Does not modify anything.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_uri: {
                readonly type: "string";
                readonly description: "ADT source URI of the object, e.g. /sap/bc/adt/oo/classes/zcl_foo/source/main.";
            };
            readonly source: {
                readonly type: "string";
                readonly description: "Current full source of the object.";
            };
            readonly line: {
                readonly type: "number";
                readonly description: "Line of the token to document (1-based).";
            };
            readonly column: {
                readonly type: "number";
                readonly description: "Column of the token (0-based).";
            };
            readonly language: {
                readonly type: "string";
                readonly description: "Documentation language (default: EN).";
            };
        };
        readonly required: readonly ["object_uri", "source", "line", "column"];
    };
};
interface GetAbapDocumentationArgs {
    object_uri: string;
    source: string;
    line: number;
    column: number;
    language?: string;
}
export declare function handleGetAbapDocumentation(context: HandlerContext, args: GetAbapDocumentationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetAbapDocumentation.d.ts.map