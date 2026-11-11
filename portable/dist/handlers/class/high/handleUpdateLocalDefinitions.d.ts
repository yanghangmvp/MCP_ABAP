/**
 * UpdateLocalDefinitions Handler - Update Local Definitions via AdtClient
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateLocalDefinitions";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update local definitions in an ABAP class (definitions include). Manages lock, check, update, unlock, and optional activation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly definitions_code: {
                readonly type: "string";
                readonly description: "Updated source code for local definitions.";
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
        readonly required: readonly ["class_name", "definitions_code"];
    };
};
interface UpdateLocalDefinitionsArgs {
    class_name: string;
    definitions_code: string;
    transport_request?: string;
    activate_on_update?: boolean;
}
export declare function handleUpdateLocalDefinitions(context: HandlerContext, args: UpdateLocalDefinitionsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateLocalDefinitions.d.ts.map