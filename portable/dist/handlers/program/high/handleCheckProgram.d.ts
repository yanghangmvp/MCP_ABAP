import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckProgram";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "Perform syntax check on an ABAP program. Returns syntax errors, warnings, and messages. Not available on cloud.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., ZMCP_MY_PROGRAM).";
            };
        };
        readonly required: readonly ["program_name"];
    };
};
export declare function handleCheckProgram(context: HandlerContext, args: {
    program_name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckProgram.d.ts.map