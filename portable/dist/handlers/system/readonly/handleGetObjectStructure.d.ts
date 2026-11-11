/**
 * Handler for retrieving ADT object structure and returning compact JSON tree.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectStructure";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve ADT object structure as a compact JSON tree.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly objecttype: {
                readonly type: "string";
                readonly description: "ADT object type (e.g. DDLS/DF)";
            };
            readonly objectname: {
                readonly type: "string";
                readonly description: "ADT object name (e.g. /CBY/ACQ_DDL)";
            };
        };
        readonly required: readonly ["objecttype", "objectname"];
    };
};
export declare function handleGetObjectStructure(context: HandlerContext, args: {
    objecttype?: string;
    objectname?: string;
    object_type?: string;
    object_name?: string;
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetObjectStructure.d.ts.map