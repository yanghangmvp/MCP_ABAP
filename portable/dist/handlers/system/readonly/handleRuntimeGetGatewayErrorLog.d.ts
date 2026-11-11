import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeGetGatewayErrorLog";
    readonly available_in: readonly ["onprem"];
    readonly description: "[runtime] List SAP Gateway error log (/IWFND/ERROR_LOG) or get error detail. Returns structured entries with type, shortText, transactionId, dateTime, username. With error_url returns full detail including serviceInfo, errorContext, sourceCode, callStack.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly error_url: {
                readonly type: "string";
                readonly description: "Feed URL of a specific error entry (from a previous list response link field). When provided, returns detailed error info instead of listing.";
            };
            readonly user: {
                readonly type: "string";
                readonly description: "Filter errors by SAP username.";
            };
            readonly max_results: {
                readonly type: "number";
                readonly description: "Maximum number of errors to return.";
            };
            readonly from: {
                readonly type: "string";
                readonly description: "Start of time range in YYYYMMDDHHMMSS format.";
            };
            readonly to: {
                readonly type: "string";
                readonly description: "End of time range in YYYYMMDDHHMMSS format.";
            };
        };
        readonly required: readonly [];
    };
};
interface RuntimeGetGatewayErrorLogArgs {
    error_url?: string;
    user?: string;
    max_results?: number;
    from?: string;
    to?: string;
}
export declare function handleRuntimeGetGatewayErrorLog(context: HandlerContext, args: RuntimeGetGatewayErrorLogArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeGetGatewayErrorLog.d.ts.map