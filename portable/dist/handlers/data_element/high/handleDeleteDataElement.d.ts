/**
 * DeleteDataElement Handler - Delete ABAP Data Element via AdtClient
 *
 * Uses AdtClient.getDataElement().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteDataElement";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP data element from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name (e.g., Z_MY_DATA_ELEMENT).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["data_element_name"];
    };
};
interface DeleteDataElementArgs {
    data_element_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteDataElement MCP tool
 *
 * Uses AdtClient.getDataElement().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteDataElement(context: HandlerContext, args: DeleteDataElementArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteDataElement.d.ts.map