"use strict";
/**
 * CreateMessageClass Handler - Create an ABAP message class (MSAG).
 *
 * ADT collection: POST /sap/bc/adt/messageclass (confirmed via discovery; a
 * live probe returned 201). No adt-clients wrapper. Individual messages are
 * added via UpdateMessageClass. Message class names: max 20 chars.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateMessageClass = handleCreateMessageClass;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateMessageClass',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Create. Subject: MessageClass. Create a new ABAP message class (MSAG) in initial state. Add messages with UpdateMessageClass.',
    inputSchema: {
        type: 'object',
        properties: {
            message_class_name: {
                type: 'string',
                description: 'Message class name (e.g., ZMY_MSG). Start with Z or Y, MAX 20 chars.',
            },
            description: {
                type: 'string',
                description: 'Description (defaults to name).',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., $TMP, ZMY_PKG).',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request (if transportable).',
            },
        },
        required: ['message_class_name', 'package_name'],
    },
};
async function handleCreateMessageClass(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.message_class_name)
            return (0, utils_1.return_error)(new Error('message_class_name is required'));
        if (!args?.package_name)
            return (0, utils_1.return_error)(new Error('package_name is required'));
        try {
            (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        }
        catch (e) {
            return (0, utils_1.return_error)(e);
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.message_class_name.toUpperCase();
        (0, utils_1.assertNameLength)('message_class', name, 'Message class');
        const description = args.description || name;
        const lang = ((0, utils_1.getSystemContext)().masterLanguage ||
            process.env.SAP_LANGUAGE ||
            'EN').toUpperCase();
        const { responsible, masterSystem } = (0, utils_1.getSystemContext)();
        const body = `<?xml version="1.0" encoding="UTF-8"?>` +
            `<mc:messageClass xmlns:mc="http://www.sap.com/adt/MessageClass" ` +
            `xmlns:adtcore="http://www.sap.com/adt/core" ` +
            `adtcore:description="${(0, adtObjectOps_1.escXml)(description)}" adtcore:name="${(0, adtObjectOps_1.escXml)(name)}" ` +
            `adtcore:type="MSAG/N" adtcore:language="${lang}" adtcore:masterLanguage="${lang}"` +
            `${masterSystem ? ` adtcore:masterSystem="${(0, adtObjectOps_1.escXml)(masterSystem)}"` : ''}` +
            `${responsible ? ` adtcore:responsible="${(0, adtObjectOps_1.escXml)(responsible)}"` : ''}>` +
            `<adtcore:packageRef adtcore:name="${(0, adtObjectOps_1.escXml)(args.package_name)}"/>` +
            `</mc:messageClass>`;
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
            await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/messageclass', 'POST', 'default', body, params, { 'Content-Type': 'application/*' });
        }
        finally {
            restoreStateless();
        }
        logger?.info(`Message class created: ${name}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                message_class_name: name,
                package_name: args.package_name,
                transport_request: args.transport_request || null,
                type: 'MSAG/N',
                message: `Message class ${name} created successfully. Use UpdateMessageClass to add messages.`,
                uri: `/sap/bc/adt/messageclass/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`,
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
            `Error creating message class ${args?.message_class_name}`,
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
//# sourceMappingURL=handleCreateMessageClass.js.map