/**
 * DeleteLocalTestClass Handler - Delete Local Test Class via AdtClient
 *
 * Uses AdtClient.getLocalTestClass().delete() for high-level delete operation.
 * Deletes by updating with empty code.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteLocalTestClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete a local test class from an ABAP class by clearing the testclasses include. Manages lock, update, unlock, and optional activation of parent class.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable objects).";
            };
            readonly activate_on_delete: {
                readonly type: "boolean";
                readonly description: "Activate parent class after deleting test class. Default: false";
                readonly default: false;
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface DeleteLocalTestClassArgs {
    class_name: string;
    transport_request?: string;
    activate_on_delete?: boolean;
}
/**
 * Main handler for DeleteLocalTestClass MCP tool
 *
 * Uses AdtClient.getLocalTestClass().delete() - high-level delete operation
 */
export declare function handleDeleteLocalTestClass(context: HandlerContext, args: DeleteLocalTestClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteLocalTestClass.d.ts.map