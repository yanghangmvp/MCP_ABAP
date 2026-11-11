import * as z from 'zod';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTableContents";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly table_name: z.ZodString;
        readonly max_rows: z.ZodOptional<z.ZodNumber>;
    };
};
export declare function handleGetTableContents(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetTableContents.d.ts.map