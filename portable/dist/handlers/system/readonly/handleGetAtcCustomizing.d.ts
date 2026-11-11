/**
 * GetAtcCustomizing Handler - Read ATC customizing (default check variant,
 * properties, exemption reasons). Mirrors abap-adt-api's atcCustomizing.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAtcCustomizing";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Get ATC customizing: the system default check variant, ATC properties, and available exemption reasons.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly required: readonly [];
    };
};
export declare function handleGetAtcCustomizing(context: HandlerContext, _args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleGetAtcCustomizing.d.ts.map