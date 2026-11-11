/**
 * GetObjectRevisions Handler - list the version/revision history of an object.
 *
 * Mirrors abap-adt-api's revisions:
 *   1. GET {object_uri}                       -> object structure with atom:links
 *   2. find the link rel="http://www.sap.com/adt/relations/versions"
 *      (for classes the links live inside <class:include> elements)
 *   3. GET {versionsUrl}  Accept: application/atom+xml;type=feed
 *   4. parse the atom feed entries into revisions
 *
 * Read-only.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectRevisions";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] List the version/revision history of an ABAP object (version id, title, date, author, and each revision's content URI). Provide the object ADT uri (e.g. /sap/bc/adt/oo/classes/zcl_foo or /sap/bc/adt/programs/programs/zfoo); for a class pass include_name (main/definitions/implementations/testclasses) to select the include. Does not modify anything.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_uri: {
                readonly type: "string";
                readonly description: "ADT object URI, e.g. /sap/bc/adt/oo/classes/zcl_foo or /sap/bc/adt/programs/programs/zfoo.";
            };
            readonly include_name: {
                readonly type: "string";
                readonly description: "(class only, optional) Include to read revisions for: main (default), definitions, implementations, testclasses.";
            };
        };
        readonly required: readonly ["object_uri"];
    };
};
interface GetObjectRevisionsArgs {
    object_uri: string;
    include_name?: string;
}
export declare function handleGetObjectRevisions(context: HandlerContext, args: GetObjectRevisionsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetObjectRevisions.d.ts.map