import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckView";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Perform syntax check on an ABAP CDS view. Checks the stored version, or DDL you supply for an existing view. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "CDS view name (e.g., ZI_MY_VIEW).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: string;
                readonly enum: readonly ["active", "inactive"];
            };
            readonly ddl_source: {
                readonly type: "string";
                readonly description: "Optional: DDL source code to validate instead of the saved version.";
            };
        };
        readonly required: readonly ["view_name"];
    };
};
export declare function handleCheckView(context: HandlerContext, args: {
    view_name: string;
    version?: string;
    ddl_source?: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckView.d.ts.map