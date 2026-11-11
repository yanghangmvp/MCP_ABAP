/**
 * GetStructure Handler - Read ABAP Structure via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP structure definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name (e.g., Z_MY_STRUCTURE).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["structure_name"];
    };
};
interface GetStructureArgs {
    structure_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetStructure(context: HandlerContext, args: GetStructureArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetStructure.d.ts.map