import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckMetadataExtension";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Perform syntax check on an ABAP metadata extension (DDLX). Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Metadata extension name (e.g., ZC_MY_DDLX).";
            };
        };
        readonly required: readonly ["name"];
    };
};
export declare function handleCheckMetadataExtension(context: HandlerContext, args: {
    name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckMetadataExtension.d.ts.map