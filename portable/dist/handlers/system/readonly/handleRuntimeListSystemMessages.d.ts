import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RuntimeListSystemMessages";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[runtime] List SM02 system messages. Returns structured entries with id, title, text, severity, validity period, and author.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly user: {
                readonly type: "string";
                readonly description: "Filter by author username.";
            };
            readonly max_results: {
                readonly type: "number";
                readonly description: "Maximum number of messages to return.";
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
interface RuntimeListSystemMessagesArgs {
    user?: string;
    max_results?: number;
    from?: string;
    to?: string;
}
export declare function handleRuntimeListSystemMessages(context: HandlerContext, args: RuntimeListSystemMessagesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRuntimeListSystemMessages.d.ts.map