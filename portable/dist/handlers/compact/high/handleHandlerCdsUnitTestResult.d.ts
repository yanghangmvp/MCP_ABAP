import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerCdsUnitTestResult";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "CDS unit test result. object_type: not used. Required: run_id*. Optional: with_navigation_uris, format(abapunit|junit). Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Unit test run id.";
            };
            readonly with_navigation_uris: {
                readonly type: "boolean";
                readonly default: false;
                readonly description: "Include ADT navigation URIs in the result payload.";
            };
            readonly format: {
                readonly type: "string";
                readonly enum: readonly ["abapunit", "junit"];
                readonly description: "Result format.";
            };
        };
        readonly required: readonly ["run_id"];
    };
};
type HandlerCdsUnitTestResultArgs = {
    run_id: string;
    with_navigation_uris?: boolean;
    format?: 'abapunit' | 'junit';
};
export declare function handleHandlerCdsUnitTestResult(context: HandlerContext, args: HandlerCdsUnitTestResultArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerCdsUnitTestResult.d.ts.map