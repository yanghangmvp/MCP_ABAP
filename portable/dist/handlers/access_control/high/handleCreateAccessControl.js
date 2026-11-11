"use strict";
/**
 * CreateAccessControl Handler - Create a CDS access control (DCL / DCLS).
 *
 * Chain: validate (existence gate) -> POST bare object -> [lock -> PUT source
 * -> unlock -> activate].
 *
 * Issued in-repo rather than through `client.getAccessControl()`; see
 * src/lib/accessControlXml.ts for the three dep defects that motivates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateAccessControl = handleCreateAccessControl;
const accessControlXml_1 = require("../../../lib/accessControlXml");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateAccessControl',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: Access Control (DCL / DCLS) — the CDS authorization layer. ' +
        'Creates a DCL source that restricts who may read a CDS entity. Supply source_code to write ' +
        'the role in the same call (recommended — a DCL with no source cannot activate); omit it to ' +
        'create an empty shell and set the source later with UpdateAccessControl. ' +
        "DCL source shape: \"@EndUserText.label: '…'  @MappingRole: true  define role <NAME> { " +
        'grant select on <CDS_ENTITY> where …; }". The role name normally matches the DCL object name, ' +
        'and the granted entity must be an ACTIVE CDS view.',
    inputSchema: {
        type: 'object',
        properties: {
            access_control_name: {
                type: 'string',
                description: 'DCL name (e.g., Z_MY_VIEW). Start with Z or Y, max 30 chars. By convention it matches the CDS entity it protects.',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., $TMP, ZMY_PKG).',
            },
            description: {
                type: 'string',
                description: 'Description (defaults to the object name). Max 60 chars; XML metacharacters are escaped for you.',
            },
            source_code: {
                type: 'string',
                description: 'Complete DCL source. Strongly recommended: without it the object is created empty and activation is skipped, because an empty DCL cannot activate.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request. Required for transportable packages, omit for $TMP.',
            },
            activate: {
                type: 'boolean',
                description: 'Activate after writing the source. DEFAULT: TRUE, but only applies when source_code is supplied (an empty DCL cannot activate). The activated field in the response is SAP’s own verdict, not a copy of this parameter.',
            },
        },
        required: ['access_control_name', 'package_name'],
    },
};
async function handleCreateAccessControl(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.access_control_name) {
            return (0, utils_1.return_error)(new Error('access_control_name is required'));
        }
        if (!args?.package_name) {
            return (0, utils_1.return_error)(new Error('package_name is required'));
        }
        try {
            (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
        }
        catch (e) {
            return (0, utils_1.return_error)(e);
        }
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.access_control_name.toUpperCase();
        (0, utils_1.assertNameLength)('access_control', name, 'Access control');
        const ctx = (0, utils_1.getSystemContext)();
        const lang = (ctx.masterLanguage ||
            process.env.SAP_LANGUAGE ||
            'EN').toUpperCase();
        const base = (0, accessControlXml_1.accessControlUri)(name);
        const description = args.description || name;
        // Fast-fail on a name clash BEFORE creating anything, so a duplicate never
        // turns into a half-created object partway through the chain.
        await (0, utils_1.assertObjectDoesNotExist)(`Access control ${name}`, () => (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/acm/dcl/validation', 'POST', 'default', undefined, {
            objname: name,
            packagename: args.package_name.toUpperCase(),
            description,
        }), connection);
        const body = (0, accessControlXml_1.buildAccessControlCreateXml)({
            name,
            packageName: args.package_name,
            description,
            masterLanguage: lang,
            masterSystem: ctx.masterSystem,
            responsible: ctx.responsible,
        });
        const params = { 'sap-language': lang };
        if (args.transport_request?.trim()) {
            params.corrNr = args.transport_request.trim();
        }
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
            await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/acm/dcl/sources', 'POST', 'default', body, params, { 'Content-Type': accessControlXml_1.CT_ACCESS_CONTROL, Accept: accessControlXml_1.CT_ACCESS_CONTROL });
        }
        finally {
            restoreStateless();
        }
        logger?.info(`Access control created: ${name}`);
        // Write the source (and activate) when supplied. An empty DCL has no role
        // definition, so activating it can only fail — hence both steps are gated
        // on source_code rather than on `activate` alone.
        let activation;
        if (args.source_code) {
            await (0, adtObjectOps_1.runLocked)(connection, base, async (lockHandle) => {
                await (0, adtObjectOps_1.putAdtSource)(connection, `${base}/source/main`, args.source_code, lockHandle, args.transport_request);
            });
            logger?.info(`Access control source written: ${name}`);
            if (args.activate !== false) {
                activation = await (0, adtObjectOps_1.activateAndEvaluate)(connection, [
                    { name, type: accessControlXml_1.ACCESS_CONTROL_TYPE },
                ]);
                if (!activation.success) {
                    throw new Error(`Access control ${name} was created and its source written, but ACTIVATION FAILED: ` +
                        `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive. ` +
                        'A DCL can only activate when the entity it grants select on is an ACTIVE CDS view ' +
                        'and the role name matches what the source declares.');
                }
            }
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: activation ? activation.success : true,
                access_control_name: name,
                package_name: args.package_name.toUpperCase(),
                transport_request: args.transport_request || null,
                type: accessControlXml_1.ACCESS_CONTROL_TYPE,
                source_written: Boolean(args.source_code),
                // SAP's verdict, never an echo of the request flag.
                activated: activation ? activation.activated : false,
                activation: activation
                    ? {
                        activated: activation.activated,
                        checked: activation.checked,
                        messages: activation.messages,
                    }
                    : undefined,
                uri: base,
                message: args.source_code
                    ? `Access control ${name} created${activation ? ' and activated' : ' (left inactive)'}.`
                    : `Access control ${name} created EMPTY. Use UpdateAccessControl to set the role source — an empty DCL cannot be activated.`,
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
        const msg = `Error creating access control ${args?.access_control_name}: ${error instanceof Error ? error.message : String(error)}${bodyText ? ` | ADT: ${bodyText.slice(0, 1000)}` : ''}`;
        logger?.error(msg);
        return (0, utils_1.return_error)(error instanceof Error ? new Error(msg) : error);
    }
}
//# sourceMappingURL=handleCreateAccessControl.js.map