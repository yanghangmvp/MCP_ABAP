/**
 * UpdateAccessControl Handler - Replace a DCL source, optionally activate.
 * Workflow: lock -> PUT source/main -> unlock -> (activate).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name (must already exist).";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete DCL source, e.g. \"@EndUserText.label: '…'  @MappingRole: true  define role Z_X { grant select on Z_X where …; }\".";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if the object is transportable).";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects are activated together afterwards via ActivateObjects). The activated field in the response is SAP’s own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["access_control_name", "source_code"];
    };
};
interface UpdateAccessControlArgs {
    access_control_name: string;
    source_code: string;
    transport_request?: string;
    activate?: boolean;
}
export declare function handleUpdateAccessControl(context: HandlerContext, args: UpdateAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateAccessControl.d.ts.map