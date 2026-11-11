/**
 * GetUnitTestStatus Handler - Read ABAP Unit test run status via AdtClient
 *
 * Uses AdtClient.getUnitTest().getStatus() for status retrieval.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetUnitTestStatus";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve ABAP Unit test run status for a run_id. NOTE: RunUnitTest/CreateUnitTest return results synchronously on modern systems; this targets the legacy async run and is generally not needed.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by unit test run.";
            };
            readonly with_long_polling: {
                readonly type: "boolean";
                readonly description: "Enable long polling while waiting for status.";
                readonly default: true;
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface GetUnitTestStatusArgs {
    run_id: string;
    with_long_polling?: boolean;
}
/**
 * Main handler for GetUnitTestStatus MCP tool
 *
 * Uses AdtClient.getUnitTest().getStatus()
 */
export declare function handleGetUnitTestStatus(context: HandlerContext, args: GetUnitTestStatusArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetUnitTestStatus.d.ts.map