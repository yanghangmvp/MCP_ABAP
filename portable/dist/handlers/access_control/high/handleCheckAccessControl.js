"use strict";
/**
 * CheckAccessControl Handler - Syntax-check a DCL source.
 *
 * With `source_code` the check runs against the SUBMITTED text (inline base64
 * artifact), so a caller can validate a draft before writing it. Without it,
 * the stored version named by `version` is checked.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckAccessControl = handleCheckAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CheckAccessControl',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Check. Subject: Access Control (DCL / DCLS). Syntax-check a DCL. Pass source_code ' +
        'to check a DRAFT before writing it (the check then runs on the text you submit, not on the ' +
        'stored version); omit it to check the stored active or inactive version.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name (must exist in the system).',
            },
            source_code: {
                type: 'string',
                description: 'Optional draft source to check INSTEAD of the stored version. Use this to validate before an update.',
            },
            version: {
                type: 'string',
                description: 'Which stored version to check when source_code is omitted: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
        },
        required: ['access_control_name'],
    },
};
async function handleCheckAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name) {
            return (0, utils_1.return_error)(new Error('access_control_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        // A draft is by definition not the active version, so check it as inactive.
        const version = args.source_code ? 'inactive' : (args.version ?? 'active');
        const report = await (0, adtObjectOps_1.checkObjectAndReport)(connection, {
            objectUri: (0, accessControlXml_1.accessControlUri)(name),
            subject: `access control ${name}`,
            version,
            sourceCode: args.source_code,
        });
        const parsed = report.check_result;
        logger?.info(`Access control check ${name}: ${parsed.has_errors ? 'ERRORS' : 'clean'} (${parsed.total_messages} message(s))`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                ...parsed,
                // Authoritative: a check with error-level messages is not a success,
                // whatever the parser's own default said.
                success: report.success,
                message: report.message,
                findings: report.findings,
                access_control_name: name,
                checked_version: args.source_code ? 'submitted source' : version,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const bodyText = error?.response?.data
            ? typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
            : '';
        const msg = `Error checking access control ${args?.access_control_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleCheckAccessControl.js.map