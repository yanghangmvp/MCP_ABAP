/**
 * DeleteXslt Handler - Delete an ABAP transformation. Workflow: lock -> DELETE.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteXslt";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Delete. Subject: Transformation (XSLT). Delete an ABAP transformation from the SAP system.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly xslt_name: {
                readonly type: "string";
                readonly description: "Transformation name.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable objects; optional for $TMP.";
            };
        };
        readonly required: readonly ["xslt_name"];
    };
};
interface DeleteXsltArgs {
    xslt_name: string;
    transport_request?: string;
}
export declare function handleDeleteXslt(context: HandlerContext, args: DeleteXsltArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteXslt.d.ts.map