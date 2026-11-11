/**
 * GetDataElement Handler - Read ABAP Data Element via AdtClient
 *
 * Uses AdtClient.getDataElement().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetDataElement";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP data element definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name (e.g., Z_MY_DATA_ELEMENT).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["data_element_name"];
    };
};
interface GetDataElementArgs {
    data_element_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetDataElement MCP tool
 *
 * Uses AdtClient.getDataElement().read() - high-level read operation
 */
export declare function handleGetDataElement(context: HandlerContext, args: GetDataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetDataElement.d.ts.map