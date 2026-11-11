/**
 * GetNodeStructure Handler - Low-level handler for node structure
 *
 * Uses fetchNodeStructure from @mcp-abap-adt/adt-clients AdtUtils.
 * Fetches node structure from ADT repository for object tree navigation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetNodeStructureLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Fetch node structure from ADT repository. Used for object tree navigation and structure discovery. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly parent_type: {
                readonly type: "string";
                readonly description: "Parent object type (e.g., \"CLAS/OC\", \"PROG/P\", \"DEVC/K\")";
            };
            readonly parent_name: {
                readonly type: "string";
                readonly description: "Parent object name";
            };
            readonly node_id: {
                readonly type: "string";
                readonly description: "Optional node ID (default: \"0000\" for root). Use to fetch child nodes.";
                readonly default: "0000";
            };
            readonly with_short_descriptions: {
                readonly type: "boolean";
                readonly description: "Include short descriptions in response";
                readonly default: true;
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
        readonly required: readonly ["parent_type", "parent_name"];
    };
};
interface GetNodeStructureArgs {
    parent_type: string;
    parent_name: string;
    node_id?: string;
    with_short_descriptions?: boolean;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for GetNodeStructureLow MCP tool
 *
 * Uses fetchNodeStructure from AdtUtils
 */
export declare function handleGetNodeStructure(context: HandlerContext, args: GetNodeStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetNodeStructure.d.ts.map