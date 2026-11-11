import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerUnitTestRun";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "ABAP Unit run. object_type: not used. Required: tests[]{container_class*, test_class*}. Optional: title, context, scope, risk_level, duration. Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly tests: {
                readonly type: "array";
                readonly description: "List of test classes to run.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly container_class: {
                            readonly type: "string";
                            readonly description: "Productive class containing tests.";
                        };
                        readonly test_class: {
                            readonly type: "string";
                            readonly description: "Local/unit test class.";
                        };
                    };
                    readonly required: readonly ["container_class", "test_class"];
                };
            };
            readonly title: {
                readonly type: "string";
                readonly description: "Run title shown in ABAP Unit logs.";
            };
            readonly context: {
                readonly type: "string";
                readonly description: "Run context label.";
            };
            readonly scope: {
                readonly type: "object";
                readonly description: "ABAP Unit scope flags.";
                readonly properties: {
                    readonly own_tests: {
                        readonly type: "boolean";
                        readonly description: "Include own tests.";
                    };
                    readonly foreign_tests: {
                        readonly type: "boolean";
                        readonly description: "Include foreign tests.";
                    };
                    readonly add_foreign_tests_as_preview: {
                        readonly type: "boolean";
                        readonly description: "Preview foreign tests without full inclusion.";
                    };
                };
            };
            readonly risk_level: {
                readonly type: "object";
                readonly description: "Allowed risk levels.";
                readonly properties: {
                    readonly harmless: {
                        readonly type: "boolean";
                        readonly description: "Allow harmless tests.";
                    };
                    readonly dangerous: {
                        readonly type: "boolean";
                        readonly description: "Allow dangerous tests.";
                    };
                    readonly critical: {
                        readonly type: "boolean";
                        readonly description: "Allow critical tests.";
                    };
                };
            };
            readonly duration: {
                readonly type: "object";
                readonly description: "Allowed duration classes.";
                readonly properties: {
                    readonly short: {
                        readonly type: "boolean";
                        readonly description: "Allow short tests.";
                    };
                    readonly medium: {
                        readonly type: "boolean";
                        readonly description: "Allow medium tests.";
                    };
                    readonly long: {
                        readonly type: "boolean";
                        readonly description: "Allow long tests.";
                    };
                };
            };
        };
        readonly required: readonly ["tests"];
    };
};
type HandlerUnitTestRunArgs = {
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
};
export declare function handleHandlerUnitTestRun(context: HandlerContext, args: HandlerUnitTestRunArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerUnitTestRun.d.ts.map