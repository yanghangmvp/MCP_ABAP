/**
 * GetCdsUnitTestStatus Handler - Read CDS unit test run status via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().getStatus() for status retrieval.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetCdsUnitTestStatus";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve CDS unit test run status for a run_id.";
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
interface GetCdsUnitTestStatusArgs {
    run_id: string;
    with_long_polling?: boolean;
}
/**
 * Main handler for GetCdsUnitTestStatus MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().getStatus()
 */
export declare function handleGetCdsUnitTestStatus(context: HandlerContext, args: GetCdsUnitTestStatusArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetCdsUnitTestStatus.d.ts.map