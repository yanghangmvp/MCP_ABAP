/**
 * DeleteAccessControl Handler - Delete a DCL source.
 *
 * Uses the shared deletion API (`/sap/bc/adt/deletion/delete`, object-type
 * agnostic) so SAP's own `del:isDeleted` and every `del:message` survive, then
 * VERIFIES against the system that the object is really gone. The dep's
 * `deleteAccessControl()` cannot be used for this: it overwrites the response
 * body with a hardcoded `{ success: true, message: "… deleted successfully" }`.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable objects; omit for $TMP.";
            };
        };
        readonly required: readonly ["access_control_name"];
    };
};
interface DeleteAccessControlArgs {
    access_control_name: string;
    transport_request?: string;
}
export declare function handleDeleteAccessControl(context: HandlerContext, args: DeleteAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteAccessControl.d.ts.map