export declare const TOOL_DEFINITION: {
    readonly name: "DescribeByList";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Batch description for a list of ABAP objects. Input: objects: Array<{ name: string, type?: string }>. Each object may be of type: PROG/P, FUGR, PROG/I, CLAS/OC, FUGR/FC, INTF/OI, TABLE, STRUCTURE, etc.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly objects: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "[read-only] Object name (required, must be valid ABAP object name or mask)";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly description: "[read-only] Optional type (e.g. PROG/P, CLAS/OC, etc.)";
                        };
                    };
                };
            };
        };
        readonly required: readonly ["objects"];
    };
};
import type { HandlerContext } from '../../../lib/handlers/interfaces';
/**
 * DescribeByListArray handler.
 * @param args { objects: Array<{ name: string, type?: string }> }
 * @returns Result of handleDetectObjectTypeList with objects
 */
export declare function handleDescribeByList(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: any[];
}>;
//# sourceMappingURL=handleDescribeByList.d.ts.map