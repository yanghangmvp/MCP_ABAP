import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckDataElement";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Perform syntax check on an ABAP data element. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name (e.g., ZDE_MY_ELEMENT).";
            };
        };
        readonly required: readonly ["data_element_name"];
    };
};
export declare function handleCheckDataElement(context: HandlerContext, args: {
    data_element_name: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckDataElement.d.ts.map