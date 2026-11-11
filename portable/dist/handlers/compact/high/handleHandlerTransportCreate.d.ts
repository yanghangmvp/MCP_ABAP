import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerTransportCreate";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Transport create. object_type: not used. Required: description*. Optional: transport_type(workbench|customizing), target_system, owner. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_type: {
                readonly type: "string";
                readonly enum: readonly ["workbench", "customizing"];
                readonly default: "workbench";
                readonly description: "Transport type.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Transport description.";
            };
            readonly target_system: {
                readonly type: "string";
                readonly description: "Target system id.";
            };
            readonly owner: {
                readonly type: "string";
                readonly description: "Transport owner user.";
            };
        };
        readonly required: readonly ["description"];
    };
};
type HandlerTransportCreateArgs = {
    transport_type?: 'workbench' | 'customizing';
    description: string;
    target_system?: string;
    owner?: string;
};
export declare function handleHandlerTransportCreate(context: HandlerContext, args: HandlerTransportCreateArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerTransportCreate.d.ts.map