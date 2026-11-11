/**
 * DeleteObject Handler - Delete ABAP objects via ADT API
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteObjectLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Delete an ABAP object via ADT deletion API. Transport request optional for $TMP objects. Note: object_type \"program\" is onprem/legacy only — calling it on ABAP Cloud will fail.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name (e.g., ZCL_MY_CLASS)";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type. Supported: class, program (onprem/legacy only), interface, function_group, function_module, table, structure, table_type, view, domain, data_element, behavior_definition, metadata_extension. Also accepts ADT codes (clas/oc, prog/p, intf/oi, fugr/f, fugr/ff, tabl/dt, tabl/ds, ttyp/da, ddls/df, doma/dm, dtel/de, bdef/bd, ddlx/ex). For a high-level delete that VERIFIES the object is really gone, prefer the per-type Delete<Object> tools - ADT answers HTTP 200 even when it refuses a deletion.";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Required only for function_module type";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number";
            };
        };
        readonly required: readonly ["object_name", "object_type"];
    };
};
interface DeleteObjectArgs {
    object_name: string;
    object_type: string;
    function_group_name?: string;
    transport_request?: string;
}
export declare function handleDeleteObject(context: HandlerContext, args: DeleteObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteObject.d.ts.map