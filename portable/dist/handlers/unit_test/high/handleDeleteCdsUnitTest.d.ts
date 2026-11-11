/**
 * DeleteCdsUnitTest Handler - Delete CDS unit test class via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().delete() for CDS-specific delete operation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteCdsUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete a CDS unit test class (global class).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Global test class name (e.g., ZCL_CDS_TEST).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface DeleteCdsUnitTestArgs {
    class_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteCdsUnitTest MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().delete() - CDS-specific delete operation
 */
export declare function handleDeleteCdsUnitTest(context: HandlerContext, args: DeleteCdsUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteCdsUnitTest.d.ts.map