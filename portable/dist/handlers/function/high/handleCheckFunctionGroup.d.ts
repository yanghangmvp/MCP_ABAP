import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Perform syntax check on an ABAP function group. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZFGRP_MY_GROUP).";
            };
        };
        readonly required: readonly ["function_group_name"];
    };
};
export declare function handleCheckFunctionGroup(context: HandlerContext, args: {
    function_group_name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckFunctionGroup.d.ts.map