/**
 * AddTransportUser Handler - add a user (own task) to a transport request.
 *
 * Mirrors abap-adt-api's transportAddUser:
 *   POST /sap/bc/adt/cts/transportrequests/{tr}/tasks
 *   body: <tm:root ... tm:targetuser tm:useraction="newtask"/>
 *
 * Mutating: creates a new task owned by the given user under the request.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "AddTransportUser";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Add a user to a transport request (creates a new task owned by that user under the request).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_number: {
                readonly type: "string";
                readonly description: "Transport request number, e.g. ABCK900001.";
            };
            readonly user: {
                readonly type: "string";
                readonly description: "SAP user name to add as a task owner.";
            };
        };
        readonly required: readonly ["transport_number", "user"];
    };
};
interface AddTransportUserArgs {
    transport_number: string;
    user: string;
}
export declare function handleAddTransportUser(context: HandlerContext, args: AddTransportUserArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleAddTransportUser.d.ts.map