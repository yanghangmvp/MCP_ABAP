/**
 * DeleteStructure Handler - Delete ABAP Structure via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete an ABAP structure from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., Z_MY_STRUCTURE).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["structure_name"];
    };
};
interface DeleteStructureArgs {
    structure_name: string;
    transport_request?: string;
}
export declare function handleDeleteStructure(context: HandlerContext, args: DeleteStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteStructure.d.ts.map