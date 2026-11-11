/**
 * GetInactiveObjects Handler - Retrieve list of inactive ABAP objects
 *
 * Reads `/sap/bc/adt/activation/inactiveobjects` in-repo rather than through the
 * dep, for two reasons: the dep's wrapper drops `adtcore:uri` (the one field that
 * makes an entry directly usable with ActivateObjects), and the endpoint returns
 * the WHOLE system's worklist with no server-side filter, so the filtering has
 * to happen here.
 *
 * NOTE ON PACKAGE FILTERING: the payload carries only uri/type/name — there is
 * no package. So filtering by package is not possible from this response, and
 * `name_prefix` is the way to ask "any of mine" (which is the question that
 * matters on a shared development system).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetInactiveObjects";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name_prefix: {
                readonly type: "string";
                readonly description: string;
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: string;
            };
        };
        readonly required: readonly [];
    };
};
interface Args {
    name_prefix?: string;
    object_type?: string;
}
interface InactiveObject {
    name: string;
    type: string;
    uri: string;
}
/** Parse `adtcore:objectReferences` into flat entries. */
export declare function parseInactiveObjects(xml: string): InactiveObject[];
export declare function handleGetInactiveObjects(context: HandlerContext, params: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetInactiveObjects.d.ts.map