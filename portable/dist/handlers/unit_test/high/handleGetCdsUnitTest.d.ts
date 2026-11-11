/**
 * GetCdsUnitTest Handler - Read CDS unit test run status/result via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().read() for high-level read operation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetCdsUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve CDS unit test run status and result for a previously started run_id.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by unit test run.";
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface GetCdsUnitTestArgs {
    run_id: string;
}
/**
 * Main handler for GetCdsUnitTest MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().read() - high-level read operation
 */
export declare function handleGetCdsUnitTest(context: HandlerContext, args: GetCdsUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetCdsUnitTest.d.ts.map