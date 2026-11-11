/**
 * UpdateMessageClass Handler - Set the messages of an ABAP message class (MSAG).
 *
 * UPSERT semantics — NOT replace, despite what this handler used to claim.
 * Measured on DM2/310 (SAP_BASIS 7.58): PUTting the class with 2 of its 3
 * messages leaves all 3 in place. Every message in the array is created or
 * updated; messages left OUT are KEPT.
 *
 * Two consequences worth knowing:
 *   - a message cannot be lost by being omitted, so the read-modify-resend loop
 *     is safer than it looks;
 *   - a message cannot be REMOVED this way either. Removing one is not reachable
 *     through ADT on this release (the /messages/{no} sub-resource refuses DELETE
 *     with ExceptionResourceInvalidLockHandle) — it needs SE91.
 *
 * To change ONE message prefer AddMessage / UpdateMessage: they read the current
 * list from SAP, so the caller does not have to hold the others at all.
 *
 * Workflow: GET current (preserve root attrs + package) -> lock -> PUT full XML
 * -> unlock. Message classes are active on save (no separate activation).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateMessageClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name (must exist).";
            };
            readonly messages: {
                readonly type: "array";
                readonly description: string;
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly msgno: {
                            readonly type: "string";
                            readonly description: "Message number 000-999 (padded to 3 digits).";
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly description: "Short text (may contain &1..&9 placeholders).";
                        };
                        readonly self_explanatory: {
                            readonly type: "boolean";
                            readonly description: "Message is self-explanatory (no long text). Default: true.";
                        };
                    };
                    readonly required: readonly ["msgno", "text"];
                };
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if transportable).";
            };
        };
        readonly required: readonly ["message_class_name", "messages"];
    };
};
interface MsgInput {
    msgno: string | number;
    text: string;
    self_explanatory?: boolean;
}
interface UpdateMessageClassArgs {
    message_class_name: string;
    messages: MsgInput[];
    transport_request?: string;
}
export declare function handleUpdateMessageClass(context: HandlerContext, args: UpdateMessageClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateMessageClass.d.ts.map