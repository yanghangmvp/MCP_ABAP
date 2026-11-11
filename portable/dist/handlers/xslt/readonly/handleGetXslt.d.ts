/**
 * GetXslt Handler - Read an ABAP Transformation (XSLT/ST) metadata + source.
 *
 * ADT has no adt-clients wrapper for transformations; we GET directly.
 * Object URL: /sap/bc/adt/xslt/transformations/{name}; source at .../source/main.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetXslt";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Read. Subject: Transformation (XSLT/ST). Retrieve an ABAP transformation: metadata and the XSLT/Simple-Transformation source code.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly xslt_name: {
                readonly type: "string";
                readonly description: "Transformation name (e.g., ZMY_XSLT).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["xslt_name"];
    };
};
interface GetXsltArgs {
    xslt_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetXslt(context: HandlerContext, args: GetXsltArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetXslt.d.ts.map