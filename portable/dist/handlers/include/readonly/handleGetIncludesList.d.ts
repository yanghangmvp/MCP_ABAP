import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetIncludesList";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[read-only] Recursively discover and list ALL include files within an ABAP program or include.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Name of the ABAP program or include";
            };
            readonly object_type: {
                readonly type: "string";
                readonly enum: readonly ["PROG/P", "PROG/I", "FUGR", "CLAS/OC"];
                readonly description: "[read-only] ADT object type of the parent. Only these four values are supported: 'PROG/P' (program), 'PROG/I' (include), 'FUGR' (function group), 'CLAS/OC' (class). Any other value is rejected by the schema.";
            };
            readonly detailed: {
                readonly type: "boolean";
                readonly description: "[read-only] If true, returns structured JSON with metadata and raw XML.";
                readonly default: false;
            };
            readonly timeout: {
                readonly type: "number";
                readonly description: "[read-only] Timeout in ms for each ADT request.";
            };
        };
        readonly required: readonly ["object_name", "object_type"];
    };
};
export declare function handleGetIncludesList(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetIncludesList.d.ts.map