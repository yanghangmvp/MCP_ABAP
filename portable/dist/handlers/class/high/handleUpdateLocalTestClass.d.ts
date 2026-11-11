/**
 * UpdateLocalTestClass Handler - Update Local Test Class via AdtClient
 *
 * Uses AdtClient.getLocalTestClass().update() for high-level update operation.
 * Includes lock, check, update, unlock, and optional activation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateLocalTestClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update a local test class in an ABAP class. Manages lock, check, update, unlock, and optional activation of parent class.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly test_class_code: {
                readonly type: "string";
                readonly description: "Updated source code for the local test class.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable objects).";
            };
            readonly activate_on_update: {
                readonly type: "boolean";
                readonly description: "Activate parent class after updating test class. Default: false";
                readonly default: false;
            };
        };
        readonly required: readonly ["class_name", "test_class_code"];
    };
};
interface UpdateLocalTestClassArgs {
    class_name: string;
    test_class_code: string;
    transport_request?: string;
    activate_on_update?: boolean;
}
/**
 * Main handler for UpdateLocalTestClass MCP tool
 *
 * Uses AdtClient.getLocalTestClass().update() - high-level update operation
 */
export declare function handleUpdateLocalTestClass(context: HandlerContext, args: UpdateLocalTestClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateLocalTestClass.d.ts.map