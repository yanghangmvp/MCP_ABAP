import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerUnitTestStatus";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "ABAP Unit status. object_type: not used. Required: run_id*. Optional: with_long_polling. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Unit test run id.";
            };
            readonly with_long_polling: {
                readonly type: "boolean";
                readonly default: true;
                readonly description: "Use long polling while waiting for completion.";
            };
        };
        readonly required: readonly ["run_id"];
    };
};
type HandlerUnitTestStatusArgs = {
    run_id: string;
    with_long_polling?: boolean;
};
export declare function handleHandlerUnitTestStatus(context: HandlerContext, args: HandlerUnitTestStatusArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerUnitTestStatus.d.ts.map