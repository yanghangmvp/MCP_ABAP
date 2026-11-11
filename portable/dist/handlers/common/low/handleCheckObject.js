"use strict";
/**
 * CheckObject Handler - Syntax check for ABAP objects via ADT API.
 *
 * Dispatches on object_type to an ADT URI and runs the check through the shared
 * `checkObjectAndReport` (see it for why none of these go through the
 * dependency's per-type check() wrappers any more).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckObject = handleCheckObject;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CheckObjectLow',
    available_in: ['onprem', 'cloud'],
    description: '[low-level] Perform syntax check on an ABAP object without activation. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            object_name: {
                type: 'string',
                description: 'Object name (e.g., ZCL_MY_CLASS, Z_MY_PROGRAM)',
            },
            object_type: {
                type: 'string',
                description: 'Object type',
                enum: [
                    'class',
                    'program',
                    'interface',
                    'function_group',
                    'table',
                    'structure',
                    'view',
                    'domain',
                    'data_element',
                    'behavior_definition',
                    'metadata_extension',
                ],
            },
            version: {
                type: 'string',
                description: "Version to check: 'active' or 'inactive' (default active)",
                enum: ['active', 'inactive'],
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
        required: ['object_name', 'object_type'],
    },
};
async function handleCheckObject(context, args) {
    const { connection, logger } = context;
    try {
        const { object_name, object_type, version = 'active', session_id, session_state, } = args;
        if (!object_name || !object_type) {
            return (0, utils_1.return_error)(new Error('object_name and object_type are required'));
        }
        const validTypes = [
            'class',
            'program',
            'interface',
            'function_group',
            'table',
            'structure',
            'view',
            'domain',
            'data_element',
            'behavior_definition',
            'metadata_extension',
        ];
        const objectType = object_type.toLowerCase();
        if (!validTypes.includes(objectType)) {
            return (0, utils_1.return_error)(new Error(`Invalid object_type. Must be one of: ${validTypes.join(', ')}`));
        }
        const validVersions = ['active', 'inactive'];
        const checkVersion = validVersions.includes(version.toLowerCase())
            ? version.toLowerCase()
            : 'active';
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        if (session_id && session_state) {
            await (0, utils_1.restoreSessionInConnection)(connection, session_id, session_state);
        }
        else {
        }
        const objectName = object_name.toUpperCase();
        logger?.info(`Starting object check: ${objectName} (type: ${objectType}, version: ${checkVersion})`);
        // object_type -> the ADT type code buildActivationUri already knows.
        const TYPE_CODES = {
            class: 'CLAS',
            program: 'PROG',
            interface: 'INTF',
            function_group: 'FUGR',
            table: 'TABL',
            structure: 'STRU',
            view: 'DDLS',
            domain: 'DOMA',
            data_element: 'DTEL',
            behavior_definition: 'BDEF',
            metadata_extension: 'DDLX',
        };
        try {
            const typeCode = TYPE_CODES[objectType];
            if (!typeCode) {
                return (0, utils_1.return_error)(new Error(`Unsupported object_type: ${object_type}`));
            }
            const report = await (0, adtObjectOps_1.checkObjectAndReport)(connection, {
                objectUri: (0, adtObjectOps_1.buildActivationUri)(objectName, typeCode),
                subject: `${objectType.replace(/_/g, ' ')} ${objectName}`,
                version: checkVersion,
            });
            const checkResult = report.check_result;
            logger?.info(`✅ CheckObject completed: ${objectName}`);
            logger?.info(`   Status: ${checkResult.status}`);
            logger?.info(`   Errors: ${checkResult.errors.length}, Warnings: ${checkResult.warnings.length}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: report.success,
                    object_name: objectName,
                    object_type: objectType,
                    version: checkVersion,
                    check_result: checkResult,
                    session_id: session_id || null,
                    session_state: null, // Session state management is now handled by auth-broker,
                    message: report.message,
                    findings: report.findings,
                }, null, 2),
            });
        }
        catch (error) {
            logger?.error(`Error checking object ${objectName}:`, error);
            let errorMessage = `Failed to check object: ${error.message || String(error)}`;
            if (error.response?.status === 404) {
                errorMessage = `Object ${objectName} not found.`;
            }
            else if (error.response?.data &&
                typeof error.response.data === 'string') {
                try {
                    const { XMLParser } = require('fast-xml-parser');
                    const parser = new XMLParser({
                        ignoreAttributes: false,
                        attributeNamePrefix: '@_',
                    });
                    const errorData = parser.parse(error.response.data);
                    const errorMsg = errorData['exc:exception']?.message?.['#text'] ||
                        errorData['exc:exception']?.message;
                    if (errorMsg) {
                        errorMessage = `SAP Error: ${errorMsg}`;
                    }
                }
                catch {
                    // ignore parse errors
                }
            }
            return (0, utils_1.return_error)(new Error(errorMessage));
        }
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCheckObject.js.map