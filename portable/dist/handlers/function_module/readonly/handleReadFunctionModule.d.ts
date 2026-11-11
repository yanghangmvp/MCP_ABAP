import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadFunctionModule";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Read, Create, Update. Subject: FunctionModule. Will be useful for reading, creating, or updating function module. [read-only] Read ABAP function module source code and metadata. Answers: \"show function module code\", \"display FM source\", \"view function X\", \"get function module implementation\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_MY_FM).";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name containing the function module (e.g., Z_MY_FG).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["function_module_name", "function_group_name"];
    };
};
export declare function handleReadFunctionModule(context: HandlerContext, args: {
    function_module_name: string;
    function_group_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadFunctionModule.d.ts.map