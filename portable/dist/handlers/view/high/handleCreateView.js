"use strict";
/**
 * CreateView Handler - CDS/Classic View Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * DDL source is set via UpdateView handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateView = handleCreateView;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateView',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Create. Subject: CDS view (DDLS). Create a new CDS DDL source. IMPORTANT: this always POSTs to /sap/bc/adt/ddic/ddl/sources and therefore produces a CDS DDL SOURCE — a CLASSIC DDIC database view (VIEW/DV) CANNOT be created with this tool; use SE11 for that. NOTE ON SHAPE: this creates an EMPTY source only — write the actual "define view entity ..." with UpdateView (which defaults to activate:FALSE, so pass activate:true or activate later with ActivateObjects).',
    inputSchema: {
        type: 'object',
        properties: {
            view_name: {
                type: 'string',
                description: 'View name (e.g., ZOK_R_TEST_0002, Z_I_MY_VIEW).',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LAB, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (required for transportable packages).',
            },
            description: {
                type: 'string',
                description: 'Optional description (defaults to view_name).',
            },
        },
        required: ['view_name', 'package_name'],
    },
};
async function handleCreateView(context, params) {
    const { connection, logger } = context;
    const args = params;
    if (!args.view_name || !args.package_name) {
        return (0, utils_1.return_error)(new Error('Missing required parameters: view_name and package_name'));
    }
    try {
        (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
    const viewName = args.view_name.toUpperCase();
    logger?.info(`Starting view creation: ${viewName}`);
    try {
        (0, utils_1.assertNameLength)('cds_view', viewName, 'View');
        const client = (0, clients_1.createAdtClient)(connection, logger);
        // Validate — fail fast BEFORE create if the name is already taken.
        logger?.debug(`Validating view: ${viewName}`);
        await (0, utils_1.assertObjectDoesNotExist)(`View ${viewName}`, () => client.getView().validate({
            viewName,
            packageName: args.package_name,
            description: args.description || viewName,
        }), connection);
        logger?.debug(`View validation passed: ${viewName}`);
        // Create the DDLS object metadata directly so we can pin sap-language.
        //
        // Root cause of the historical 400 (DDIC_ADT_DDLS/016 "Language EN ... not
        // equal to original ZH"): the ADT DDL endpoint compares the description
        // language declared in the payload (adtcore:masterLanguage) against the
        // session's logon language, which becomes the new object's ORIGINAL
        // language. The connection layer never sends sap-language, so the logon
        // language is the SAP user's account default (e.g. ZH) — while the payload
        // defaulted to EN, so they never matched. We POST the create ourselves with
        // sap-language == the declared masterLanguage, making the two equal by
        // construction on any account/system. (validate() above does not create the
        // object, so its language is irrelevant.)
        const lang = ((0, utils_1.getSystemContext)().masterLanguage ||
            process.env.SAP_LANGUAGE ||
            'EN').toUpperCase();
        const esc = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const description = (args.description || viewName).slice(0, 60);
        const { responsible, masterSystem } = (0, utils_1.getSystemContext)();
        const responsibleAttr = responsible
            ? ` adtcore:responsible="${esc(responsible)}"`
            : '';
        const masterSystemAttr = masterSystem
            ? ` adtcore:masterSystem="${esc(masterSystem)}"`
            : '';
        const metadataXml = `<?xml version="1.0" encoding="UTF-8"?>` +
            `<ddl:ddlSource xmlns:ddl="http://www.sap.com/adt/ddic/ddlsources" ` +
            `xmlns:adtcore="http://www.sap.com/adt/core" ` +
            `adtcore:description="${esc(description)}" adtcore:language="${lang}" ` +
            `adtcore:name="${esc(viewName)}" adtcore:type="DDLS/DF" ` +
            `adtcore:masterLanguage="${lang}"${masterSystemAttr}${responsibleAttr}>` +
            `<adtcore:packageRef adtcore:name="${esc(args.package_name)}"/>` +
            `</ddl:ddlSource>`;
        const createParams = { 'sap-language': lang };
        const corrNr = args.transport_request?.trim();
        if (corrNr)
            createParams.corrNr = corrNr;
        logger?.debug(`Creating view: ${viewName} (sap-language=${lang})`);
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/ddic/ddl/sources', 'POST', 'default', metadataXml, createParams, {
            Accept: 'application/vnd.sap.adt.ddlSource.v2+xml, application/vnd.sap.adt.ddlSource+xml',
            'Content-Type': 'application/vnd.sap.adt.ddlSource+xml',
        });
        logger?.info(`View created: ${viewName}`);
        const result = {
            success: true,
            view_name: viewName,
            package_name: args.package_name,
            transport_request: args.transport_request || null,
            type: 'DDLS',
            message: `View ${viewName} created successfully. Use UpdateView to set DDL source code.`,
            uri: `/sap/bc/adt/ddic/ddl/sources/${(0, utils_1.encodeSapObjectName)(viewName).toLowerCase()}`,
            steps_completed: ['validate', 'create'],
        };
        return (0, utils_1.return_response)({
            data: JSON.stringify(result, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        // Surface the raw ADT response body — the DDL endpoints return the concrete
        // reason (e.g. invalid package for a CDS entity, unsupported endpoint
        // version) in the body, which the bare error.message hides.
        const status = error?.response?.status;
        const body = error?.response?.data;
        const bodyText = body
            ? typeof body === 'string'
                ? body
                : JSON.stringify(body)
            : '';
        const base = error instanceof Error ? error.message : String(error);
        const errorMessage = [
            `Error creating view ${viewName}`,
            status ? `HTTP ${status}` : '',
            base,
            bodyText ? `ADT response: ${bodyText.slice(0, 1500)}` : '',
        ]
            .filter(Boolean)
            .join(' | ');
        logger?.error(errorMessage);
        return (0, utils_1.return_error)(new Error(errorMessage));
    }
}
//# sourceMappingURL=handleCreateView.js.map