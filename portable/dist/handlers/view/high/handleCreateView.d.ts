/**
 * CreateView Handler - CDS/Classic View Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * DDL source is set via UpdateView handler.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateView";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: CDS view (DDLS). Create a new CDS DDL source. IMPORTANT: this always POSTs to /sap/bc/adt/ddic/ddl/sources and therefore produces a CDS DDL SOURCE — a CLASSIC DDIC database view (VIEW/DV) CANNOT be created with this tool; use SE11 for that. NOTE ON SHAPE: this creates an EMPTY source only — write the actual \"define view entity ...\" with UpdateView (which defaults to activate:FALSE, so pass activate:true or activate later with ActivateObjects).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., ZOK_R_TEST_0002, Z_I_MY_VIEW).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LAB, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description (defaults to view_name).";
            };
        };
        readonly required: readonly ["view_name", "package_name"];
    };
};
export declare function handleCreateView(context: HandlerContext, params: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleCreateView.d.ts.map