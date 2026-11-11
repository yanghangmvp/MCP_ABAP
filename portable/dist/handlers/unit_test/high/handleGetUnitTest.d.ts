/**
 * GetUnitTest Handler - Read ABAP Unit test status/result via AdtClient
 *
 * Uses AdtClient.getUnitTest().read() for high-level read operation.
 * Retrieves test run status and result for a previously started run.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP Unit test run status and result for a previously started run_id. NOTE: on modern systems RunUnitTest/CreateUnitTest already return the full result synchronously (in the \"result\" field) — this run_id lookup targets the legacy async run and is generally not needed.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by RunUnitTest.";
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface GetUnitTestArgs {
    run_id: string;
}
/**
 * Main handler for GetUnitTest MCP tool
 *
 * Uses AdtClient.getUnitTest().read() - high-level read operation
 */
export declare function handleGetUnitTest(context: HandlerContext, args: GetUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetUnitTest.d.ts.map