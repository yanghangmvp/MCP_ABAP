/**
 * CreateMessageClass Handler - Create an ABAP message class (MSAG).
 *
 * ADT collection: POST /sap/bc/adt/messageclass (confirmed via discovery; a
 * live probe returned 201). No adt-clients wrapper. Individual messages are
 * added via UpdateMessageClass. Message class names: max 20 chars.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateMessageClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: MessageClass. Create a new ABAP message class (MSAG) in initial state. Add messages with UpdateMessageClass.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name (e.g., ZMY_MSG). Start with Z or Y, MAX 20 chars.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description (defaults to name).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., $TMP, ZMY_PKG).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if transportable).";
            };
        };
        readonly required: readonly ["message_class_name", "package_name"];
    };
};
interface CreateMessageClassArgs {
    message_class_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
}
export declare function handleCreateMessageClass(context: HandlerContext, args: CreateMessageClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateMessageClass.d.ts.map