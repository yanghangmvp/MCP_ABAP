/**
 * CreateXslt Handler - Create an ABAP Transformation (XSLT/ST).
 *
 * ADT collection: POST /sap/bc/adt/xslt/transformations (confirmed via
 * /sap/bc/adt/discovery on S/4 7.56). No adt-clients wrapper exists, so the
 * metadata POST is issued directly. Source is set via UpdateXslt.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateXslt";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: Transformation (XSLT/ST). Create a new ABAP transformation in initial state. Choose transformation_type: XSLTProgram (XSLT, default) or SimpleTransformation (ST). Set the source with UpdateXslt.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly xslt_name: {
                readonly type: "string";
                readonly description: "Transformation name (e.g., ZMY_XSLT). Start with Z or Y, max 30 chars.";
            };
            readonly transformation_type: {
                readonly type: "string";
                readonly description: "Transformation kind: 'XSLTProgram' (XSLT, default) or 'SimpleTransformation' (ST, source starts with <?sap.transform simple?>).";
                readonly enum: readonly ["XSLTProgram", "SimpleTransformation"];
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description (defaults to xslt_name).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., $TMP, ZMY_PKG).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable packages.";
            };
        };
        readonly required: readonly ["xslt_name", "package_name"];
    };
};
interface CreateXsltArgs {
    xslt_name: string;
    transformation_type?: 'XSLTProgram' | 'SimpleTransformation';
    description?: string;
    package_name: string;
    transport_request?: string;
}
export declare function handleCreateXslt(context: HandlerContext, args: CreateXsltArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateXslt.d.ts.map