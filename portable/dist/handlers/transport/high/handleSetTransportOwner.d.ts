/**
 * SetTransportOwner Handler - change the owner of a transport request.
 *
 * Mirrors abap-adt-api's transportSetOwner:
 *   PUT /sap/bc/adt/cts/transportrequests/{tr}?targetuser={user}
 *   body: <tm:root ... tm:number tm:targetuser tm:useraction="changeowner"/>
 *
 * Mutating.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "SetTransportOwner";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Change the owner of a transport request to another user.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_number: {
                readonly type: "string";
                readonly description: "Transport request number, e.g. ABCK900001.";
            };
            readonly owner: {
                readonly type: "string";
                readonly description: "New owner (SAP user name).";
            };
        };
        readonly required: readonly ["transport_number", "owner"];
    };
};
interface SetTransportOwnerArgs {
    transport_number: string;
    owner: string;
}
export declare function handleSetTransportOwner(context: HandlerContext, args: SetTransportOwnerArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleSetTransportOwner.d.ts.map