import type { HandlerContext } from '../../../lib/handlers/interfaces';
/**
 * Kept as its own operation rather than folded into a routed handler: this is
 * the sweep. It is the one call in the reporting project's process that does not
 * take another tool's word for anything, and it is why the compact facade could
 * not be their default (field report round 7, F-9).
 */
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerInactiveObjects";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "List objects left INACTIVE in the system — the sweep that catches what a failed write left behind. Optional: name_prefix, object_type. Response: JSON list with uri.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name_prefix: {
                readonly type: "string";
                readonly description: "Only objects whose name starts with this.";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Only this ADT type, e.g. 'CLAS/OC'.";
            };
        };
        readonly required: readonly [];
    };
};
type HandlerInactiveObjectsArgs = {
    name_prefix?: string;
    object_type?: string;
};
export declare function handleHandlerInactiveObjects(context: HandlerContext, args: HandlerInactiveObjectsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerInactiveObjects.d.ts.map