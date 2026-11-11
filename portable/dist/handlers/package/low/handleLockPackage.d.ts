/**
 * LockPackage Handler - Lock ABAP Package
 *
 * Uses AdtClient.lockPackage from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "LockPackageLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Lock an ABAP package for modification. Returns lock handle that must be used in subsequent update/unlock operations with the same session_id. Requires super_package.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_TEST_0002).";
            };
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package (parent package) name (e.g., ZOK_PACKAGE). Required.";
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
        readonly required: readonly ["package_name", "super_package"];
    };
};
interface LockPackageArgs {
    package_name: string;
    super_package: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for LockPackage MCP tool
 *
 * Uses AdtClient.lockPackage - low-level single method call
 */
export declare function handleLockPackage(context: HandlerContext, args: LockPackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleLockPackage.d.ts.map