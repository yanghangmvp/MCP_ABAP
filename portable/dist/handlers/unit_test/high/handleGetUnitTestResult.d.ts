/**
 * GetUnitTestResult Handler - Read ABAP Unit test run result via AdtClient
 *
 * Uses AdtClient.getUnitTest().getResult() for result retrieval.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetUnitTestResult";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP Unit test run result for a run_id. NOTE: RunUnitTest/CreateUnitTest return the result synchronously on modern systems; this targets the legacy async run and is generally not needed.";
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
interface GetUnitTestResultArgs {
    run_id: string;
    with_navigation_uris?: boolean;
    format?: 'abapunit' | 'junit';
}
/**
 * Main handler for GetUnitTestResult MCP tool
 *
 * Uses AdtClient.getUnitTest().getResult()
 */
export declare function handleGetUnitTestResult(context: HandlerContext, args: GetUnitTestResultArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetUnitTestResult.d.ts.map