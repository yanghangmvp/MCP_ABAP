"use strict";
/**
 * CreateXslt Handler - Create an ABAP Transformation (XSLT/ST).
 *
 * ADT collection: POST /sap/bc/adt/xslt/transformations (confirmed via
 * /sap/bc/adt/discovery on S/4 7.56). No adt-clients wrapper exists, so the
 * metadata POST is issued directly. Source is set via UpdateXslt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateXslt = handleCreateXslt;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateXslt',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Create. Subject: Transformation (XSLT/ST). Create a new ABAP transformation in initial state. Choose transformation_type: XSLTProgram (XSLT, default) or SimpleTransformation (ST). Set the source with UpdateXslt.',
    inputSchema: {
        type: 'object',
        properties: {
            xslt_name: {
                type: 'string',
                description: 'Transformation name (e.g., ZMY_XSLT). Start with Z or Y, max 30 chars.',
            },
            transformation_type: {
                type: 'string',
                description: "Transformation kind: 'XSLTProgram' (XSLT, default) or 'SimpleTransformation' (ST, source starts with <?sap.transform simple?>).",
                enum: ['XSLTProgram', 'SimpleTransformation'],
            },
            description: {
                type: 'string',
                description: 'Description (defaults to xslt_name).',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., $TMP, ZMY_PKG).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable packages.',
            },
        },
        required: ['xslt_name', 'package_name'],
    },
};
async function handleCreateXslt(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.xslt_name)
            return (0, utils_1.return_error)(new Error('xslt_name is required'));
        if (!args?.package_name)
            return (0, utils_1.return_error)(new Error('package_name is required'));
        try {
            (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        }
        catch (e) {
            return (0, utils_1.return_error)(e);
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.xslt_name.toUpperCase();
        const description = args.description || name;
        const lang = ((0, utils_1.getSystemContext)().masterLanguage ||
            process.env.SAP_LANGUAGE ||
            'EN').toUpperCase();
        const { responsible, masterSystem } = (0, utils_1.getSystemContext)();
        const transformationType = args.transformation_type === 'SimpleTransformation'
            ? 'SimpleTransformation'
            : 'XSLTProgram';
        const body = `<?xml version="1.0" encoding="UTF-8"?>` +
            `<trans:transformation xmlns:trans="http://www.sap.com/adt/transformation" ` +
            `xmlns:adtcore="http://www.sap.com/adt/core" trans:transformationType="${transformationType}" ` +
            `adtcore:description="${(0, adtObjectOps_1.escXml)(description)}" adtcore:language="${lang}" ` +
            `adtcore:name="${(0, adtObjectOps_1.escXml)(name)}" adtcore:type="XSLT/VT" adtcore:masterLanguage="${lang}"` +
            `${masterSystem ? ` adtcore:masterSystem="${(0, adtObjectOps_1.escXml)(masterSystem)}"` : ''}` +
            `${responsible ? ` adtcore:responsible="${(0, adtObjectOps_1.escXml)(responsible)}"` : ''}>` +
            `<adtcore:packageRef adtcore:name="${(0, adtObjectOps_1.escXml)(args.package_name)}"/>` +
            `</trans:transformation>`;
        const params = { 'sap-language': lang };
        if (args.transport_request?.trim())
            params.corrNr = args.transport_request.trim();
        // Force stateless for the POST. Both mechanisms are needed:
        //   * setSessionMode omits the stateful header, but it does NOT terminate a
        //     server session an earlier stateful op (lock/activate) left alive on
        //     this shared connection — so the create still lands in that session and
        //     the new object is born holding an implicit EDIT LOCK, which then makes
        //     every later lock fail 403 "<user> is currently editing <object>".
        //   * withExplicitStatelessHeader SENDS `x-sap-adt-sessiontype: stateless`,
        //     which does terminate it.
        // Proven by an A/B probe on DM2: with setSessionMode alone a freshly created
        // message class was already locked; with the explicit header it was not.
        // Same remedy as the P4 GetPackageContents nodestructure-bleed fix.
        (0, adtObjectOps_1.setSessionMode)(connection, 'stateless');
        const restoreStateless = (0, utils_1.withExplicitStatelessHeader)(connection);
        try {
            await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/xslt/transformations', 'POST', 'default', body, params, { 'Content-Type': 'application/*' });
        }
        finally {
            restoreStateless();
        }
        logger?.info(`Transformation created: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                xslt_name: name,
                package_name: args.package_name,
                transport_request: args.transport_request || null,
                type: 'XSLT/VT',
                message: `Transformation ${name} created successfully. Use UpdateXslt to set the source code.`,
                uri: `/sap/bc/adt/xslt/transformations/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const status = error?.response?.status;
        const body = error?.response?.data;
        const bodyText = body
            ? typeof body === 'string'
                ? body
                : JSON.stringify(body)
            : '';
        const msg = [
            `Error creating transformation ${args?.xslt_name}`,
            status ? `HTTP ${status}` : '',
            error instanceof Error ? error.message : String(error),
            bodyText ? `ADT response: ${bodyText.slice(0, 1200)}` : '',
        ]
            .filter(Boolean)
            .join(' | ');
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=handleCreateXslt.js.map