/**
 * CreateCdsUnitTest Handler - Create CDS unit test class via AdtClient
 *
 * Uses AdtClient.getCdsUnitTest().validate() and .create() for CDS-specific lifecycle.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateCdsUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Create a CDS unit test class with CDS validation. Creates the test class in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Global test class name (e.g., ZCL_CDS_TEST).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_TEST_PKG_01, $TMP).";
            };
            readonly cds_view_name: {
                readonly type: "string";
                readonly description: "CDS view name to validate for unit test doubles.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Optional description for the global test class.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
            };
        };
        readonly required: readonly ["class_name", "package_name", "cds_view_name"];
    };
};
interface CreateCdsUnitTestArgs {
    class_name: string;
    package_name: string;
    cds_view_name: string;
    class_template?: string;
    test_class_source?: string;
    description?: string;
    transport_request?: string;
}
/**
 * Main handler for CreateCdsUnitTest MCP tool
 *
 * Uses AdtClient.getCdsUnitTest().validate() and .create()
 */
export declare function handleCreateCdsUnitTest(context: HandlerContext, args: CreateCdsUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateCdsUnitTest.d.ts.map