/**
 * UnlockPackage Handler - Unlock ABAP Package
 *
 * Uses AdtClient.unlockPackage from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockPackageLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP package after modification. Requires lock handle from LockObject and superPackage. - requires the lock_handle from LockObject.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_TEST_0002). Package must already exist.";
            };
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package (parent package) name. Required for package operations.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockObject operation";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from LockObject operation. Must be the same as used in LockObject.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from LockObject (cookies, csrf_token, cookie_store). Required if session_id is provided.";
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
        readonly required: readonly ["package_name", "super_package", "lock_handle"];
    };
};
interface UnlockPackageArgs {
    package_name: string;
    super_package: string;
    lock_handle: string;
    session_id: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for UnlockPackage MCP tool
 *
 * Uses AdtClient.unlockPackage - low-level single method call
 */
export declare function handleUnlockPackage(context: HandlerContext, args: UnlockPackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockPackage.d.ts.map