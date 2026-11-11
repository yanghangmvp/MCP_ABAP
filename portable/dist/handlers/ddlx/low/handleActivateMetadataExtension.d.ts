/**
 * ActivateMetadataExtension Handler - Activate ABAP Metadata Extension
 *
 * Uses AdtClient.activateMetadataExtension from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateMetadataExtensionLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Activate, Create, Update. Subject: MetadataExtension. Will be useful for activating, creating, or updating metadata extension. [low-level] Activate an ABAP metadata extension. Returns activation status and any warnings/errors. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Metadata extension name (e.g., ZC_MY_EXTENSION).";
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
interface ActivateMetadataExtensionArgs {
    name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for ActivateMetadataExtension MCP tool
 *
 * Uses AdtClient.activateMetadataExtension - low-level single method call
 */
export declare function handleActivateMetadataExtension(context: HandlerContext, args: ActivateMetadataExtensionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateMetadataExtension.d.ts.map