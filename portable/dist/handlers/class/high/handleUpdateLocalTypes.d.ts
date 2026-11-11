/**
 * UpdateLocalTypes Handler - Update Local Types via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateLocalTypes";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update local types in an ABAP class (implementations include). Manages lock, check, update, unlock, and optional activation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly local_types_code: {
                readonly type: "string";
                readonly description: "Updated source code for local types.";
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
        readonly required: readonly ["class_name", "local_types_code"];
    };
};
interface UpdateLocalTypesArgs {
    class_name: string;
    local_types_code: string;
    transport_request?: string;
    activate_on_update?: boolean;
}
export declare function handleUpdateLocalTypes(context: HandlerContext, args: UpdateLocalTypesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateLocalTypes.d.ts.map