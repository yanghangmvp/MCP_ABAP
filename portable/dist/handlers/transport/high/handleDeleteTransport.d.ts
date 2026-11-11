/**
 * DeleteTransport Handler - delete an (unreleased) transport request.
 *
 * Mirrors abap-adt-api's transportDelete:
 *   DELETE /sap/bc/adt/cts/transportrequests/{tr}
 *
 * Mutating: only works on modifiable (not yet released) requests.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteTransport";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Delete a modifiable (not yet released) transport request. Fails if the request has already been released.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_number: {
                readonly type: "string";
                readonly description: "Transport request number to delete, e.g. ABCK900001.";
            };
        };
        readonly required: readonly ["transport_number"];
    };
};
interface DeleteTransportArgs {
    transport_number: string;
}
export declare function handleDeleteTransport(context: HandlerContext, args: DeleteTransportArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteTransport.d.ts.map