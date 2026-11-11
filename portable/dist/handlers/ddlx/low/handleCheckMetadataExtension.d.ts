/**
 * CheckMetadataExtension Handler - Syntax check for ABAP MetadataExtension
 *
 * Uses AdtClient.checkMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckMetadataExtensionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Perform syntax check on an ABAP metadata extension. Returns syntax errors, warnings, and messages. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "MetadataExtension name (e.g., ZI_MY_DDLX).";
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
        readonly required: readonly ["name"];
    };
};
interface CheckMetadataExtensionArgs {
    name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CheckMetadataExtension MCP tool
 *
 * Uses AdtClient.checkMetadataExtension - low-level single method call
 */
export declare function handleCheckMetadataExtension(context: HandlerContext, args: CheckMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckMetadataExtension.d.ts.map