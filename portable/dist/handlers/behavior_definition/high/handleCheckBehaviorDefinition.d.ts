import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckBehaviorDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Perform syntax check on an ABAP behavior definition (BDEF). Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "BehaviorDefinition name (e.g., ZI_MY_BDEF).";
            };
        };
        readonly required: readonly ["name"];
    };
};
export declare function handleCheckBehaviorDefinition(context: HandlerContext, args: {
    name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckBehaviorDefinition.d.ts.map