"use strict";
/**
 * GetXslt Handler - Read an ABAP Transformation (XSLT/ST) metadata + source.
 *
 * ADT has no adt-clients wrapper for transformations; we GET directly.
 * Object URL: /sap/bc/adt/xslt/transformations/{name}; source at .../source/main.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetXslt = handleGetXslt;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetXslt',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Read. Subject: Transformation (XSLT/ST). Retrieve an ABAP transformation: metadata and the XSLT/Simple-Transformation source code.',
    inputSchema: {
        type: 'object',
        properties: {
            xslt_name: {
                type: 'string',
                description: 'Transformation name (e.g., ZMY_XSLT).',
            },
            version: {
                type: 'string',
                description: 'Version to read: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
        },
        required: ['xslt_name'],
    },
};
async function handleGetXslt(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.xslt_name)
            return (0, utils_1.return_error)(new Error('xslt_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.xslt_name.toUpperCase();
        const base = `/sap/bc/adt/xslt/transformations/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        const params = args.version ? { version: args.version } : undefined;
        const metadata = await (0, adtObjectOps_1.getAdt)(connection, base, params);
        let source = '';
        try {
            source = await (0, adtObjectOps_1.getAdt)(connection, `${base}/source/main`, params);
        }
        catch (e) {
            logger?.warn(`Could not read xslt source for ${name}: ${e?.message || e}`);
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({ success: true, xslt_name: name, metadata, source }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetXslt.js.map