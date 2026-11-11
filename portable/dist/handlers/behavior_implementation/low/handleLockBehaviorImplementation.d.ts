/**
 * LockBehaviorImplementation Handler - Lock ABAP Behavior Implementation Class
 *
 * Uses AdtClient.lockClass from @mcp-abap-adt/adt-clients (BehaviorImplementation extends ClassBuilder).
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "LockBehaviorImplementationLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Lock an ABAP behavior implementation class for modification. Returns lock handle that must be used in subsequent update/unlock operations with the same session_id.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Behavior Implementation class name (e.g., ZBP_MY_ENTITY).";
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
        readonly required: readonly ["class_name"];
    };
};
interface LockBehaviorImplementationArgs {
    class_name: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for LockBehaviorImplementation MCP tool
 *
 * Uses AdtClient.lockClass - BehaviorImplementation extends ClassBuilder
 */
export declare function handleLockBehaviorImplementation(context: HandlerContext, args: LockBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleLockBehaviorImplementation.d.ts.map