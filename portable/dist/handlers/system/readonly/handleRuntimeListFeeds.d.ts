import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeListFeeds";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] List available ADT runtime feeds or read a specific feed type. Feed types: dumps, system_messages, gateway_errors. Without feed_type returns available feed descriptors.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly feed_type: {
                readonly type: "string";
                readonly enum: readonly ["descriptors", "variants", "dumps", "system_messages", "gateway_errors"];
                readonly description: "Feed to read. \"descriptors\" lists available feeds, \"variants\" lists feed variants, others read that specific feed. Default: descriptors.";
                readonly default: "descriptors";
            };
            readonly user: {
                readonly type: "string";
                readonly description: "Filter feed entries by SAP username.";
            };
            readonly max_results: {
                readonly type: "number";
                readonly description: "Maximum number of entries to return.";
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
interface RuntimeListFeedsArgs {
    feed_type?: 'descriptors' | 'variants' | 'dumps' | 'system_messages' | 'gateway_errors';
    user?: string;
    max_results?: number;
    from?: string;
    to?: string;
}
export declare function handleRuntimeListFeeds(context: HandlerContext, args: RuntimeListFeedsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeListFeeds.d.ts.map