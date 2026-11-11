"use strict";
/**
 * CreateUnitTest Handler - Start ABAP Unit test run via AdtClient
 *
 * Uses AdtClient.getUnitTest().create() for high-level test run operation.
 * Starts unit test execution and returns run_id for status/result queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateUnitTest = handleCreateUnitTest;
const unitTestRun_1 = require("../../../lib/unitTestRun");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CreateUnitTest',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Start an ABAP Unit test run for provided class test definitions. Returns run_id for status/result queries.',
    inputSchema: {
        type: 'object',
        properties: {
            tests: {
                type: 'array',
                description: 'List of container/test class pairs to execute.',
                items: {
                    type: 'object',
                    properties: {
                        container_class: {
                            type: 'string',
                            description: 'Class that owns the test include (e.g., ZCL_MAIN_CLASS).',
                        },
                        test_class: {
                            type: 'string',
                            description: 'Test class name inside the include (e.g., LTCL_MAIN_CLASS).',
                        },
                    },
                    required: ['container_class', 'test_class'],
                },
            },
            title: {
                type: 'string',
                description: 'Optional title for the ABAP Unit run.',
            },
            context: {
                type: 'string',
                description: 'Optional context string shown in SAP tools.',
            },
            scope: {
                type: 'object',
                properties: {
                    own_tests: { type: 'boolean' },
                    foreign_tests: { type: 'boolean' },
                    add_foreign_tests_as_preview: { type: 'boolean' },
                },
            },
            risk_level: {
                type: 'object',
                properties: {
                    harmless: { type: 'boolean' },
                    dangerous: { type: 'boolean' },
                    critical: { type: 'boolean' },
                },
            },
            duration: {
                type: 'object',
                properties: {
                    short: { type: 'boolean' },
                    medium: { type: 'boolean' },
                    long: { type: 'boolean' },
                },
            },
        },
        required: ['tests'],
    },
};
/**
 * Main handler for CreateUnitTest MCP tool
 *
 * Uses AdtClient.getUnitTest().create() - high-level test run operation
 */
async function handleCreateUnitTest(context, args) {
    const { connection, logger } = context;
    try {
        const { tests, risk_level, duration } = args;
        // Validation
        if (!Array.isArray(tests) || tests.length === 0) {
            return (0, utils_1.return_error)(new Error('tests array with at least one entry is required'));
        }
        const formattedTests = tests.map((test) => ({
            containerClass: test.container_class.toUpperCase(),
            testClass: test.test_class.toUpperCase(),
        }));
        logger?.info(`Starting ABAP Unit run for ${formattedTests.length} test definition(s)`);
        try {
            // Synchronous /testruns run (bypasses the dep's 404-ing /runs path).
            const response = await (0, unitTestRun_1.startUnitTestRunSync)(connection, formattedTests, {
                riskLevel: risk_level,
                duration,
            });
            const result = (0, unitTestRun_1.parseUnitTestRunResult)(response);
            const runId = (0, unitTestRun_1.extractUnitTestRunId)(response);
            logger?.info(`✅ CreateUnitTest completed: ${result.passed_methods}/${result.total_methods} passed`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    run_id: runId,
                    result,
                    message: `ABAP Unit run completed: ${result.passed_methods}/${result.total_methods} method(s) passed, ${result.failed_methods} failed.`,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error starting ABAP Unit run: ${error?.message || error}`);
            return (0, utils_1.return_error)(new Error(error?.message || String(error)));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateUnitTest.js.map