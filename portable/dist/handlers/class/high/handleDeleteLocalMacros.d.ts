/**
 * DeleteLocalMacros Handler - Delete Local Macros via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteLocalMacros";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete local macros from an ABAP class by clearing the macros include. Manages lock, update, unlock, and optional activation. Note: Macros are supported in older ABAP versions but not in newer ones.";
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
interface DeleteLocalMacrosArgs {
    class_name: string;
    transport_request?: string;
    activate_on_delete?: boolean;
}
export declare function handleDeleteLocalMacros(context: HandlerContext, args: DeleteLocalMacrosArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteLocalMacros.d.ts.map