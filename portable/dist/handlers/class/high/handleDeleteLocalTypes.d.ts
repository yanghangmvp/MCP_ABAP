/**
 * DeleteLocalTypes Handler - Delete Local Types via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteLocalTypes";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete local types from an ABAP class by clearing the implementations include. Manages lock, update, unlock, and optional activation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number.";
            };
            readonly activate_on_delete: {
                readonly type: "boolean";
                readonly description: "Activate parent class after deleting. Default: false";
                readonly default: false;
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface DeleteLocalTypesArgs {
    class_name: string;
    transport_request?: string;
    activate_on_delete?: boolean;
}
export declare function handleDeleteLocalTypes(context: HandlerContext, args: DeleteLocalTypesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteLocalTypes.d.ts.map