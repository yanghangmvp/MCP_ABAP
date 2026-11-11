/**
 * GetClassUnitTestStatus Handler - Fetch ABAP Unit run status
 *
 * Uses AdtClient.getClassUnitTestRunStatus from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetClassUnitTestStatusLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Retrieve ABAP Unit run status XML for a previously started run_id. NOTE: RunClassUnitTestsLow returns results synchronously; this targets the legacy async run and is generally not needed.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly run_id: {
                readonly type: "string";
                readonly description: "Run identifier returned by RunClassUnitTestsLow.";
            };
            readonly with_long_polling: {
                readonly type: "boolean";
                readonly description: "Optional flag to enable SAP long-polling (default true).";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                    };
                };
            };
        };
        readonly required: readonly ["run_id"];
    };
};
interface GetStatusArgs {
    run_id: string;
    with_long_polling?: boolean;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleGetClassUnitTestStatus(context: HandlerContext, args: GetStatusArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetClassUnitTestStatus.d.ts.map