/**
 * ActivateXslt Handler - Activate an ABAP transformation (XSLT/ST).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateXslt";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Activate an ABAP transformation (XSLT). Use after CreateXslt or UpdateXslt if it remains inactive.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly xslt_name: {
                readonly type: "string";
                readonly description: "Transformation name.";
            };
        };
        readonly required: readonly ["xslt_name"];
    };
};
interface ActivateXsltArgs {
    xslt_name: string;
}
export declare function handleActivateXslt(context: HandlerContext, args: ActivateXsltArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateXslt.d.ts.map