import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[read-only] Read ABAP function group source code and metadata. Answers: \"show function group code\", \"display FUGR source\", \"view function group X\", \"get function group includes\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., Z_MY_FG).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["function_group_name"];
    };
};
export declare function handleReadFunctionGroup(context: HandlerContext, args: {
    function_group_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadFunctionGroup.d.ts.map