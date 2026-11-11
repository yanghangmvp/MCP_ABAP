"use strict";
/**
 * GetAccessControl Handler - Read a DCL source (metadata + source text).
 *
 * Object URI: /sap/bc/adt/acm/dcl/sources/{name}; source at .../source/main.
 * The collection accepts only application/vnd.sap.adt.dclSource+xml.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetAccessControl = handleGetAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetAccessControl',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Operation: Read. Subject: Access Control (DCL / DCLS). Retrieve a CDS access ' +
        'control: its metadata (package, description, responsible, version) and the DCL role source. ' +
        'Works for SAP-delivered DCLs too — useful for learning the syntax of a real role definition.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name (e.g., Z_MY_VIEW, C_ACCOUNTINGDOCUMENT).',
            },
            version: {
                type: 'string',
                description: 'Version to read: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
        },
        required: ['access_control_name'],
    },
};
async function handleGetAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name) {
            return (0, utils_1.return_error)(new Error('access_control_name is required'));
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        const base = (0, accessControlXml_1.accessControlUri)(name);
        const params = { version: args.version || 'active' };
        const metadata = await (0, utils_1.makeAdtRequestWithTimeout)(connection, base, 'GET', 'default', undefined, params, { Accept: accessControlXml_1.CT_ACCESS_CONTROL });
        let source = '';
        try {
            const src = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `${base}/source/main`, 'GET', 'default', undefined, params);
            source = String(src.data ?? '');
        }
        catch (e) {
            logger?.warn(`Could not read access control source for ${name}: ${e?.message || e}`);
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                access_control_name: name,
                version: params.version,
                metadata: String(metadata.data ?? ''),
                source,
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
        let msg = `Error reading access control ${args?.access_control_name}: ${error instanceof Error ? error.message : String(error)}`;
        if (error?.response?.status === 404) {
            msg =
                `Access control ${args?.access_control_name?.toUpperCase()} not found. ` +
                    'Note that a DCL exists only if one was created for the CDS entity — many CDS views have none.';
        }
        else if (bodyText) {
            msg += ` | ADT: ${bodyText.slice(0, 1000)}`;
        }
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleGetAccessControl.js.map