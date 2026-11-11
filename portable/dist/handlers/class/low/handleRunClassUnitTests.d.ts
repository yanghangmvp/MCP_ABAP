/**
 * RunClassUnitTests Handler - Start ABAP Unit run for class-based tests
 *
 * Uses AdtClient.runClassUnitTests from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
type RiskOptions = {
    harmless?: boolean;
    dangerous?: boolean;
    critical?: boolean;
};
type DurationOptions = {
    short?: boolean;
    medium?: boolean;
    long?: boolean;
};
export declare const TOOL_DEFINITION: {
    readonly name: "RunClassUnitTestsLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Start an ABAP Unit test run for provided class test definitions. Returns run_id extracted from SAP response headers.";
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
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                    };
                };
            };
        };
        readonly required: readonly ["tests"];
    };
};
interface TestDefinitionInput {
    container_class: string;
    test_class: string;
}
interface RunClassUnitTestsArgs {
    tests: TestDefinitionInput[];
    title?: string;
    context?: string;
    scope?: {
        own_tests?: boolean;
        foreign_tests?: boolean;
        add_foreign_tests_as_preview?: boolean;
    };
    risk_level?: RiskOptions;
    duration?: DurationOptions;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleRunClassUnitTests(context: HandlerContext, args: RunClassUnitTestsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRunClassUnitTests.d.ts.map