export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectsByType";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieves all ABAP objects of a specific type (classes, tables, programs, interfaces, etc.) under a given parent node. Useful for listing all objects of one type within a package or composite object.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly parent_name: {
                readonly type: "string";
                readonly description: "[read-only] Parent object name";
            };
            readonly parent_tech_name: {
                readonly type: "string";
                readonly description: "[read-only] Parent technical name";
            };
            readonly parent_type: {
                readonly type: "string";
                readonly description: "[read-only] Parent object type";
            };
            readonly node_id: {
                readonly type: "string";
                readonly description: "[read-only] Node ID";
            };
            readonly format: {
                readonly type: "string";
                readonly description: "[read-only] Output format: 'raw' or 'parsed'";
            };
            readonly with_short_descriptions: {
                readonly type: "boolean";
                readonly description: "[read-only] Include short descriptions";
            };
        };
        readonly required: readonly ["parent_name", "parent_tech_name", "parent_type", "node_id"];
    };
};
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare function handleGetObjectsByType(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleGetObjectsByType.d.ts.map