/**
 * AddMessage — add one message to a message class (SE91).
 *
 * The message list is read from SAP and written back with one entry changed, so
 * the caller never holds the messages it is not touching. See editMessageCore.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type MessageEditArgs } from './editMessageCore';
export declare const TOOL_DEFINITION: {
    readonly name: "AddMessage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name (e.g., ZMY_MSGCLASS).";
            };
            readonly msgno: {
                readonly type: "string";
                readonly description: "Message number, 1-3 digits. Zero-padded automatically (\"7\" and \"007\" are the same message).";
            };
            readonly text: {
                readonly type: "string";
                readonly description: "Message short text. May contain the placeholders &1 &2 &3 &4. Max 73 characters.";
            };
            readonly self_explanatory: {
                readonly type: "boolean";
                readonly description: "Whether the message is self-explanatory (no long text needed). Default true.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request, when the class is in a transportable package.";
            };
        };
        readonly required: readonly ["message_class_name", "msgno", "text"];
    };
};
export declare function handleAddMessage(context: HandlerContext, args: MessageEditArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleAddMessage.d.ts.map