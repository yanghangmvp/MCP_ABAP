/**
 * RunUnitTest Handler - Start ABAP Unit test run via AdtClient
 *
 * Uses AdtClient.getUnitTest().create() for high-level test run operation.
 * Starts unit test execution and returns run_id for status/result queries.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RunUnitTest";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Start an ABAP Unit test run for provided class test definitions. Returns run_id for status/result queries.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly tests: {
                readonly type: "array";
                readonly description: "List of container/test class pairs to execute.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly container_class: {
                            readonly type: "string";
                            readonly description: "Class that owns the test include (e.g., ZCL_MAIN_CLASS).";
                        };
                        readonly test_class: {
                            readonly type: "string";
                            readonly description: "Test class name inside the include (e.g., LTCL_MAIN_CLASS).";
                        };
                    };
                    readonly required: readonly ["container_class", "test_class"];
                };
            };
            readonly title: {
                readonly type: "string";
                readonly description: "Optional title for the ABAP Unit run.";
            };
            readonly context: {
                readonly type: "string";
                readonly description: "Optional context string shown in SAP tools.";
            };
            readonly scope: {
                readonly type: "object";
                readonly properties: {
                    readonly own_tests: {
                        readonly type: "boolean";
                    };
                    readonly foreign_tests: {
                        readonly type: "boolean";
                    };
                    readonly add_foreign_tests_as_preview: {
                        readonly type: "boolean";
                    };
                };
            };
            readonly risk_level: {
                readonly type: "object";
                readonly properties: {
                    readonly harmless: {
                        readonly type: "boolean";
                    };
                    readonly dangerous: {
                        readonly type: "boolean";
                    };
                    readonly critical: {
                        readonly type: "boolean";
                    };
                };
            };
            readonly duration: {
                readonly type: "object";
                readonly properties: {
                    readonly short: {
                        readonly type: "boolean";
                    };
                    readonly medium: {
                        readonly type: "boolean";
                    };
                    readonly long: {
                        readonly type: "boolean";
                    };
                };
            };
            readonly summary: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly full: {
                readonly type: "boolean";
                readonly description: string;
            };
        };
        readonly required: readonly ["tests"];
    };
};
interface RunUnitTestArgs {
    tests: Array<{
        container_class: string;
        test_class: string;
    }>;
    title?: string;
    context?: string;
    scope?: {
        own_tests?: boolean;
        foreign_tests?: boolean;
        add_foreign_tests_as_preview?: boolean;
    };
    risk_level?: {
        harmless?: boolean;
        dangerous?: boolean;
        critical?: boolean;
    };
    duration?: {
        short?: boolean;
        medium?: boolean;
        long?: boolean;
    };
    summary?: boolean;
    full?: boolean;
}
/**
 * Main handler for RunUnitTest MCP tool
 *
 * Uses AdtClient.getUnitTest().create() - high-level test run operation
 */
export declare function handleRunUnitTest(context: HandlerContext, args: RunUnitTestArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRunUnitTest.d.ts.map