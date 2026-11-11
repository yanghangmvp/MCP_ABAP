import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Read, Create, Update. Subject: ServiceBinding. Will be useful for reading, creating, or updating service binding. [read-only] Read ABAP service binding (SRVB) payload and metadata. Answers: \"show service binding\", \"display SRVB config\", \"view service binding X\", \"get OData service binding\". Returns payload, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name (e.g., ZUI_MY_BINDING).";
            };
        };
        readonly required: readonly ["service_binding_name"];
    };
};
export declare function handleReadServiceBinding(context: HandlerContext, args: {
    service_binding_name: string;
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadServiceBinding.d.ts.map