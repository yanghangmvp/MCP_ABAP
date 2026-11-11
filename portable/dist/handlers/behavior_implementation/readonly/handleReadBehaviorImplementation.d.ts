import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadBehaviorImplementation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Read ABAP RAP behavior implementation source code and metadata. Answers: \"show behavior implementation\", \"display behavior pool code\", \"view RAP implementation X\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_implementation_name: {
                readonly type: "string";
                readonly description: "Behavior implementation name (e.g., ZBP_MY_CLASS).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["behavior_implementation_name"];
    };
};
export declare function handleReadBehaviorImplementation(context: HandlerContext, args: {
    behavior_implementation_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadBehaviorImplementation.d.ts.map