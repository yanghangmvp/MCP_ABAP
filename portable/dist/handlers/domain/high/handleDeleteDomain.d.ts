/**
 * DeleteDomain Handler - Delete ABAP Domain via AdtClient
 *
 * Uses AdtClient.getDomain().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteDomain";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP domain from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., Z_MY_DOMAIN).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["domain_name"];
    };
};
interface DeleteDomainArgs {
    domain_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteDomain MCP tool
 *
 * Uses AdtClient.getDomain().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteDomain(context: HandlerContext, args: DeleteDomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteDomain.d.ts.map