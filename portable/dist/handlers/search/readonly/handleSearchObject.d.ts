import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "SearchObject";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Search ABAP repository by object name or wildcard pattern (e.g. 'ZOK*'). Answers: \"find object X\", \"does X exist\", \"list objects matching...\", \"search for program/class/table by name\". Supports all repository object types — optionally filter by type (PROG, CLAS, INTF, DEVC, TABL, DDLS, DTEL, FUGR, SRVD, SRVB, BDEF, DDLX, etc.).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: string;
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "[read-only] Optional ABAP object type (e.g. 'TABL', 'CLAS/OC')";
            };
            readonly maxResults: {
                readonly type: "number";
                readonly description: "[read-only] Maximum number of results to return";
                readonly default: 100;
            };
        };
        readonly required: readonly ["object_name"];
    };
};
export declare function handleSearchObject(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: any[];
}>;
//# sourceMappingURL=handleSearchObject.d.ts.map