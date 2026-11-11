/**
 * GetObjectStructure Handler - Low-level handler for object structure
 *
 * Uses getObjectStructure from @mcp-abap-adt/adt-clients AdtUtils.
 * Retrieves ADT object structure as compact JSON tree.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectStructureLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Retrieve ADT object structure as compact JSON tree. Returns XML response with object structure tree. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type (e.g., \"CLAS/OC\", \"PROG/P\", \"DEVC/K\", \"DDLS/DF\")";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name (e.g., \"ZMY_CLASS\", \"ZMY_PROGRAM\")";
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
        readonly required: readonly ["object_type", "object_name"];
    };
};
interface GetObjectStructureArgs {
    object_type: string;
    object_name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for GetObjectStructureLow MCP tool
 *
 * Uses getObjectStructure from AdtUtils
 */
export declare function handleGetObjectStructure(context: HandlerContext, args: GetObjectStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetObjectStructure.d.ts.map