import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerUnitTestResult";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "ABAP Unit result. object_type: not used. Required: run_id*. Optional: with_navigation_uris, format(abapunit|junit). Response: JSON.";
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
type HandlerUnitTestResultArgs = {
    run_id: string;
    with_navigation_uris?: boolean;
    format?: 'abapunit' | 'junit';
};
export declare function handleHandlerUnitTestResult(context: HandlerContext, args: HandlerUnitTestResultArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerUnitTestResult.d.ts.map