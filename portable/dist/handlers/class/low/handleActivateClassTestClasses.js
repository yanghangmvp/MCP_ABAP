"use strict";
/**
 * ActivateClassTestClasses Handler - Activate ABAP Unit test include for a class
 *
 * Uses AdtClient.activateTestClasses from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleActivateClassTestClasses = handleActivateClassTestClasses;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ActivateClassTestClassesLow',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: '[low-level] Activate ABAP Unit test classes include for an existing class. Should be executed after updating and unlocking test classes.',
    inputSchema: {
        type: 'object',
        properties: {
            class_name: {
                type: 'string',
                description: 'Class name (e.g., ZCL_MY_CLASS).',
            },
            test_class_name: {
                type: 'string',
                description: 'Optional ABAP Unit test class name (e.g., LTCL_MY_CLASS). Defaults to auto-detected value.',
            },
            session_id: {
                type: 'string',
                description: 'Session ID from GetSession. If not provided, a new session will be created.',
            },
            session_state: {
                type: 'object',
                description: 'Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.',
                properties: {
                    cookies: { type: 'string' },
                    csrf_token: { type: 'string' },
                    cookie_store: { type: 'object' },
                },
            },
        },
        required: ['class_name'],
    },
};
async function handleActivateClassTestClasses(context, args) {
    const { connection, logger } = context;
    try {
        const { class_name, test_class_name, session_id, session_state } = args;
        if (!class_name) {
            return (0, utils_1.return_error)(new Error('class_name is required'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        else {
        }
        const className = class_name.toUpperCase();
        const testClassName = test_class_name
            ? test_class_name.toUpperCase()
            : undefined;
        logger?.info(`Starting test classes activation for: ${className}`);
        try {
            const classClient = client.getClass();
            // Activate the parent class — this activates all its local includes (test classes, definitions, etc.)
            const activationResult = await classClient.activate({ className });
            // SAP answers HTTP 200 while REFUSING an activation; the refusal lives
            // only in the response messages. This used to report `success: true` with
            // the HTTP status in a field named `status`, so a rejected test include
            // read as "activated successfully".
            const outcome = (0, adtObjectOps_1.evaluateActivationResponse)(activationResult);
            logger?.info(`ActivateClassTestClasses ${className}: ${(0, adtMessages_1.describeActivation)(outcome, `Test classes for ${className}`)}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: outcome.success,
                    class_name: className,
                    session_id: session_id || null,
                    activation: (0, adtMessages_1.activationFlags)(outcome, outcome),
                    http_status: activationResult?.activateResult?.status,
                    session_state: null, // Session state management is now handled by auth-broker,
                    ...(outcome.errors.length ? { errors: outcome.errors } : {}),
                    ...(outcome.warnings.length ? { warnings: outcome.warnings } : {}),
                    message: (0, adtMessages_1.describeActivation)(outcome, `Test classes for ${className}`),
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error activating test classes for ${className}: ${error?.message || error}`);
            const reason = error?.response?.status === 404
                ? `Class ${className} not found or test classes are missing.`
                : error?.message || String(error);
            return (0, utils_1.return_error)(new Error(reason));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleActivateClassTestClasses.js.map