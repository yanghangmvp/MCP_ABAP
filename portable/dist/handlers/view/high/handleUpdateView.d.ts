/**
 * UpdateView Handler - Update existing CDS/Classic view DDL source
 *
 * Workflow: lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive) -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateView";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Update, Create. Subject: View. Will be useful for updating or creating view. Update DDL source code of an existing CDS View or Classic View. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name (e.g., ZOK_R_TEST_0002).";
            };
            readonly ddl_source: {
                readonly type: "string";
                readonly description: "Complete DDL source code.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: FALSE — omitting it leaves the object INACTIVE, so pass true explicitly if you want it usable. (Update* tools are not consistent on this default: DDIC tools such as UpdateTable / UpdateStructure default to true.) The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["view_name", "ddl_source"];
    };
};
export declare function handleUpdateView(context: HandlerContext, params: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleUpdateView.d.ts.map