/**
 * DeleteUnitTest Handler - Delete ABAP Unit test run via AdtClient
 *
 * Uses AdtClient.getUnitTest().delete() for high-level delete operation.
 * Note: ADT does not support deleting unit test runs.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete an ABAP Unit test run. Note: ADT does not support deleting unit test runs and will return an error.";
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
interface DeleteUnitTestArgs {
    run_id: string;
}
/**
 * Main handler for DeleteUnitTest MCP tool
 *
 * Uses AdtClient.getUnitTest().delete() - high-level delete operation
 */
export declare function handleDeleteUnitTest(context: HandlerContext, args: DeleteUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteUnitTest.d.ts.map