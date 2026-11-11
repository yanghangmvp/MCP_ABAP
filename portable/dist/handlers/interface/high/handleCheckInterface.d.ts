import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckInterface";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Perform syntax check on an ABAP interface. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., ZIF_MY_INTERFACE).";
            };
        };
        readonly required: readonly ["interface_name"];
    };
};
export declare function handleCheckInterface(context: HandlerContext, args: {
    interface_name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckInterface.d.ts.map