import * as z from 'zod';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetInclude";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[read-only] Read ANY single ABAP include source by name, from anywhere in the repository (an include may live outside any single program tree). This is the correct tool for include names (PROG/I) — ReadProgram does not read includes.";
    readonly inputSchema: {
        readonly include_name: z.ZodString;
    };
};
export declare function handleGetInclude(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleGetInclude.d.ts.map