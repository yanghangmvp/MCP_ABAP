import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadServiceDefinition";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Read, Create, Update. Subject: ServiceDefinition. Will be useful for reading, creating, or updating service definition. [read-only] Read ABAP service definition (SRVD) source code and metadata. Answers: \"show service definition\", \"display SRVD source\", \"view service definition X\", \"get service exposure\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition name (e.g., Z_MY_SRVD).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["service_definition_name"];
    };
};
export declare function handleReadServiceDefinition(context: HandlerContext, args: {
    service_definition_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadServiceDefinition.d.ts.map