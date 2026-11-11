import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAbapSemanticAnalysis";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Perform semantic analysis on ABAP code and return symbols, types, scopes, and dependencies.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly code: {
                readonly type: "string";
                readonly description: "ABAP source code to analyze";
            };
        };
        readonly required: readonly ["code"];
    };
};
export declare function handleGetAbapSemanticAnalysis(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetAbapSemanticAnalysis.d.ts.map