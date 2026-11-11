import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckFunctionModule";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Perform syntax check on an ABAP function module. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name containing the function module.";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_MY_FUNCTION).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to check: 'active' or 'inactive'. Default: active.";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["function_group_name", "function_module_name"];
    };
};
export declare function handleCheckFunctionModule(context: HandlerContext, args: {
    function_group_name: string;
    function_module_name: string;
    version?: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckFunctionModule.d.ts.map