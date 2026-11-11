/**
 * GetDomain Handler - Read ABAP Domain via AdtClient
 *
 * Uses AdtClient.getDomain().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetDomain";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP domain definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., Z_MY_DOMAIN).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["domain_name"];
    };
};
interface GetDomainArgs {
    domain_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetDomain MCP tool
 *
 * Uses AdtClient.getDomain().read() - high-level read operation
 */
export declare function handleGetDomain(context: HandlerContext, args: GetDomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetDomain.d.ts.map