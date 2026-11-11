/**
 * UpdateLocalMacros Handler - Update Local Macros via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateLocalMacros";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update local macros in an ABAP class (macros include). Manages lock, check, update, unlock, and optional activation. Note: Macros are supported in older ABAP versions but not in newer ones.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly macros_code: {
                readonly type: "string";
                readonly description: "Updated source code for local macros.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number.";
            };
            readonly activate_on_update: {
                readonly type: "boolean";
                readonly description: "Activate parent class after updating. Default: false";
                readonly default: false;
            };
        };
        readonly required: readonly ["class_name", "macros_code"];
    };
};
interface UpdateLocalMacrosArgs {
    class_name: string;
    macros_code: string;
    transport_request?: string;
    activate_on_update?: boolean;
}
export declare function handleUpdateLocalMacros(context: HandlerContext, args: UpdateLocalMacrosArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateLocalMacros.d.ts.map