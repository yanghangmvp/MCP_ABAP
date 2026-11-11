/**
 * GetSession Handler - Get session ID and session state for reuse across multiple requests
 *
 * Returns session ID and session state (cookies, CSRF token) that can be passed
 * to other handlers to maintain the same session and lock handle across operations.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetSession";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Get a new session ID and current session state (cookies, CSRF token) for reuse across multiple ADT operations, plus the identity of the server build answering: server_version, build_timestamp (the build actually LOADED, not the file currently on disk), started_at and pid. Call it first when recording a measurement, so the result can be attributed to a build.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly force_new: {
                readonly type: "boolean";
                readonly description: "Force creation of a new session even if one exists. Default: false";
            };
        };
        readonly required: readonly [];
    };
};
interface GetSessionArgs {
    force_new?: boolean;
}
/**
 * Main handler for GetSession MCP tool
 *
 * Returns session ID and session state that can be reused in other handlers
 */
export declare function handleGetSession(context: HandlerContext, args: GetSessionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetSession.d.ts.map