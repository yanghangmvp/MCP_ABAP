import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAbapAST";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Parse ABAP code and return AST (Abstract Syntax Tree) in JSON format.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly code: {
                readonly type: "string";
                readonly description: "ABAP source code to parse";
            };
        };
        readonly required: readonly ["code"];
    };
};
export declare function handleGetAbapAST(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetAbapAST.d.ts.map