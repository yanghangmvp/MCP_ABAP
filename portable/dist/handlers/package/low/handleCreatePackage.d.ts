/**
 * CreatePackage Handler - Create ABAP Package
 *
 * Uses AdtClient.createPackage from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreatePackageLow";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[low-level] Create a new ABAP package. - use CreatePackage (high-level) for full workflow with validation, lock, update, check, unlock, and activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_TEST_0002). Must follow SAP naming conventions.";
            };
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package (parent package) name (e.g., ZOK_PACKAGE). Required.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Package description.";
            };
            readonly package_type: {
                readonly type: "string";
                readonly description: "Package type (development/structure). Defaults to development.";
            };
            readonly software_component: {
                readonly type: "string";
                readonly description: "Software component (e.g., HOME, ZLOCAL). If not provided, SAP will set a default (typically ZLOCAL for local packages).";
            };
            readonly transport_layer: {
                readonly type: "string";
                readonly description: "Transport layer (e.g., ZDEV). Required for transportable packages.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly record_changes: {
                readonly type: "boolean";
                readonly description: "Enable change recording for the package. Required for transportable packages (non-$TMP). Default: false.";
            };
            readonly application_component: {
                readonly type: "string";
                readonly description: "Application component (e.g., BC-ABA).";
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
        readonly required: readonly ["package_name", "super_package", "description"];
    };
};
interface CreatePackageArgs {
    package_name: string;
    super_package: string;
    description: string;
    package_type?: string;
    software_component?: string;
    transport_layer?: string;
    transport_request?: string;
    record_changes?: boolean;
    application_component?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
/**
 * Main handler for CreatePackage MCP tool
 *
 * Uses AdtClient.createPackage - low-level single method call
 */
export declare function handleCreatePackage(context: HandlerContext, args: CreatePackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreatePackage.d.ts.map