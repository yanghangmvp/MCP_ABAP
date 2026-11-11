/**
 * DeletePackage Handler - Delete ABAP Package
 *
 * Uses AdtClient.deletePackage from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import { type SapConfig } from '@mcp-abap-adt/connection';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeletePackageLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Delete an ABAP package from the SAP system via ADT deletion API. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., Z_MY_PROGRAM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
            readonly force_new_connection: {
                readonly type: "boolean";
                readonly description: "Force creation of a new connection (bypass cache). Useful when package was locked/unlocked and needs to be deleted in a fresh session. Default: false.";
            };
            readonly connection_config: {
                readonly type: "object";
                readonly description: "Optional SAP connection config to create a fresh connection for deletion. Useful when the existing connection config is unavailable.";
            };
        };
        readonly required: readonly ["package_name"];
    };
};
interface DeletePackageArgs {
    package_name: string;
    transport_request?: string;
    force_new_connection?: boolean;
    connection_config?: SapConfig;
}
/**
 * Main handler for DeletePackage MCP tool
 *
 * Uses AdtClient.deletePackage - low-level single method call
 */
export declare function handleDeletePackage(context: HandlerContext, args: DeletePackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeletePackage.d.ts.map