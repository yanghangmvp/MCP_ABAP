/**
 * ValidatePackage Handler - Validate ABAP Package Name
 *
 * Uses AdtClient.validatePackage from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ValidatePackageLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Validate an ABAP package name before creation. Checks if the name is valid and available. Returns validation result with success status and message. Can use session_id and session_state from GetSession to maintain the same session.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name to validate (e.g., Z_MY_PROGRAM).";
            };
            readonly super_package: {
                readonly type: "string";
                readonly description: "Parent (super) package name. The new package will be created under this package.";
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
interface ValidatePackageArgs {
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
 * Main handler for ValidatePackage MCP tool
 *
 * Uses AdtClient.validatePackage - low-level single method call
 */
export declare function handleValidatePackage(context: HandlerContext, args: ValidatePackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleValidatePackage.d.ts.map