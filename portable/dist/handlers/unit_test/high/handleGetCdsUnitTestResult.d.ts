/**
 * GetCdsUnitTestResult Handler - Read CDS unit test run result via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().getResult() for result retrieval.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetCdsUnitTestResult";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve CDS unit test run result for a run_id.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by unit test run.";
            };
            readonly with_navigation_uris: {
                readonly type: "boolean";
                readonly description: "Include navigation URIs in result if supported.";
                readonly default: false;
            };
            readonly format: {
                readonly type: "string";
                readonly description: "Result format: abapunit or junit.";
                readonly enum: readonly ["abapunit", "junit"];
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface GetCdsUnitTestResultArgs {
    run_id: string;
    with_navigation_uris?: boolean;
    format?: 'abapunit' | 'junit';
}
/**
 * Main handler for GetCdsUnitTestResult MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().getResult()
 */
export declare function handleGetCdsUnitTestResult(context: HandlerContext, args: GetCdsUnitTestResultArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetCdsUnitTestResult.d.ts.map