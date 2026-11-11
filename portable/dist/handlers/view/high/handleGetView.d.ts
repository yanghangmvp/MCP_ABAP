/**
 * GetView Handler - Read ABAP View via AdtClient
 *
 * Uses AdtClient.getView().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetView";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve an ABAP view definition (CDS DDL source or classic view). Supports reading the active or inactive version. IMPORTANT: pass the DDL SOURCE object name, which is often NOT the CDS entity name — a source ZI_ORDER may define entity ZI_ORDER_E, and passing the entity name returns 404. Use SearchObject with type DDLS to find the source name.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "DDL SOURCE object name (e.g., Z_MY_VIEW) — not the CDS entity name defined inside it. The two frequently differ; using the entity name gives 404.";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["view_name"];
    };
};
interface GetViewArgs {
    view_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetView MCP tool
 *
 * Uses AdtClient.getView().read() - high-level read operation
 */
export declare function handleGetView(context: HandlerContext, args: GetViewArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetView.d.ts.map