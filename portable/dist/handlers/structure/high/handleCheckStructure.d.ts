import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Perform syntax check on an ABAP structure. Checks the stored version, or DDL you supply for an existing structure. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., ZST_MY_STRUCTURE).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: string;
                readonly enum: readonly ["active", "inactive"];
            };
            readonly ddl_code: {
                readonly type: "string";
                readonly description: "Optional: DDL source code to validate instead of the saved version.";
            };
        };
        readonly required: readonly ["structure_name"];
    };
};
export declare function handleCheckStructure(context: HandlerContext, args: {
    structure_name: string;
    version?: string;
    ddl_code?: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckStructure.d.ts.map