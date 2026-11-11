/**
 * UpdateXslt Handler - Set/replace an ABAP transformation's source, optionally activate.
 * Workflow: lock -> PUT source/main -> unlock -> (activate).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateXslt";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Update. Subject: Transformation (XSLT). Update the source of an existing ABAP transformation. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly xslt_name: {
                readonly type: "string";
                readonly description: "Transformation name (must exist).";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete XSLT / Simple Transformation source.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if transportable).";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["xslt_name", "source_code"];
    };
};
interface UpdateXsltArgs {
    xslt_name: string;
    source_code: string;
    transport_request?: string;
    activate?: boolean;
}
export declare function handleUpdateXslt(context: HandlerContext, args: UpdateXsltArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateXslt.d.ts.map