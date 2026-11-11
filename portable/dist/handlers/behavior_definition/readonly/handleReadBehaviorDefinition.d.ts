import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadBehaviorDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Read, Create, Update. Subject: BehaviorDefinition. Will be useful for reading, creating, or updating behavior definition. [read-only] Read ABAP RAP behavior definition (BDEF) source code and metadata. Answers: \"show behavior definition\", \"display BDEF source\", \"view RAP behavior X\", \"get behavior definition code\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly behavior_definition_name: {
                readonly type: "string";
                readonly description: "Behavior definition name (e.g., Z_MY_BDEF).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["behavior_definition_name"];
    };
};
export declare function handleReadBehaviorDefinition(context: HandlerContext, args: {
    behavior_definition_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadBehaviorDefinition.d.ts.map