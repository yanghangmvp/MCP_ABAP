/**
 * UpdateCdsUnitTest Handler - Update CDS unit test class via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().update() for CDS-specific update operation.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateCdsUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update a CDS unit test class local test class source code.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Global test class name (e.g., ZCL_CDS_TEST).";
            };
            readonly test_class_source: {
                readonly type: "string";
                readonly description: "Updated local test class ABAP source code.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
            };
        };
        readonly required: readonly ["class_name", "test_class_source"];
    };
};
interface UpdateCdsUnitTestArgs {
    class_name: string;
    test_class_source: string;
    transport_request?: string;
}
/**
 * Main handler for UpdateCdsUnitTest MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().update() - CDS-specific update operation
 */
export declare function handleUpdateCdsUnitTest(context: HandlerContext, args: UpdateCdsUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateCdsUnitTest.d.ts.map