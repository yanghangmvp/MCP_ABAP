/**
 * DeleteTableType Handler — delete an ABAP table type (TTYP).
 *
 * Counterpart to CreateTableType; table types previously had no delete tool
 * either, so test/scratch table types could not be cleaned up through the MCP.
 *
 * Deletion goes through the shared `/sap/bc/adt/deletion/delete` helper so
 * SAP's own `isDeleted` verdict and every `del:message` reach the caller, and
 * the result is then VERIFIED against the system — ADT answers HTTP 200 when it
 * refuses a deletion, so "it returned" is never proof that the object is gone.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteTableType";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Delete. Subject: Table type (TTYP). Delete an ABAP table type. Fails with SAP's own reason (and verifies the object is really gone) when the deletion is refused — e.g. while a structure still references the table type.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_type_name: {
                readonly type: "string";
                readonly description: "Table type name (e.g., ZTT_ORDER_ITEM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable packages; leave empty for $TMP.";
            };
        };
        readonly required: readonly ["table_type_name"];
    };
};
interface DeleteTableTypeArgs {
    table_type_name: string;
    transport_request?: string;
}
export declare function handleDeleteTableType(context: HandlerContext, args: DeleteTableTypeArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteTableType.d.ts.map