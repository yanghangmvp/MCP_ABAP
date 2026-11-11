/**
 * UpdateUnitTest Handler - Update ABAP Unit test run via AdtClient
 *
 * Uses AdtClient.getUnitTest().update() for high-level update operation.
 * Note: ADT does not support update for unit test runs.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update an ABAP Unit test run. Note: ADT does not support updating unit test runs and will return an error.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by CreateUnitTest/RunUnitTest.";
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface UpdateUnitTestArgs {
    run_id: string;
}
/**
 * Main handler for UpdateUnitTest MCP tool
 *
 * Uses AdtClient.getUnitTest().update() - high-level update operation
 */
export declare function handleUpdateUnitTest(context: HandlerContext, args: UpdateUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateUnitTest.d.ts.map