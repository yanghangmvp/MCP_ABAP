/**
 * DeleteMessageClass Handler - Delete an ABAP message class (MSAG).
 * Workflow: lock -> DELETE.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteMessageClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Delete. Subject: MessageClass. Delete an ABAP message class (MSAG) from the SAP system.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable objects; optional for $TMP.";
            };
        };
        readonly required: readonly ["message_class_name"];
    };
};
interface DeleteMessageClassArgs {
    message_class_name: string;
    transport_request?: string;
}
export declare function handleDeleteMessageClass(context: HandlerContext, args: DeleteMessageClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteMessageClass.d.ts.map