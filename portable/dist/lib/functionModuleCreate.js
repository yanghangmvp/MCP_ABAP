"use strict";
/**
 * Function module creation — in-repo bypass of the adt-clients dep.
 *
 * WHY: two reasons, one of them blocking.
 *
 * 1. THE PROCESSING TYPE CANNOT BE SET. The dep's `core/functionModule/create.js`
 *    emits only description/name/type plus the containerRef, so every function
 *    module it creates is a plain NORMAL module. A V1 **update module** — the
 *    kind called with `CALL FUNCTION ... IN UPDATE TASK` and whose failure is
 *    what makes `COMMIT WORK AND WAIT` report `sy-subrc <> 0` — could therefore
 *    not be created through this MCP at all, so a test asserting that behaviour
 *    could not be written.
 *
 *    The attributes exist and are plainly visible on SAP's own modules. Read
 *    live from DM2/310 (S/4HANA 2023 FPS02) and cross-checked against TFDIR:
 *
 *      processingType | updateTaskKind           | TFDIR-UTASK | SE37 radio button
 *      ---------------+--------------------------+-------------+---------------------------
 *      normal         | (absent)                 | ''          | Normal Function Module
 *      rfc            | (absent)                 | '' (FMODE=R)| Remote-Enabled Module
 *      update         | startImmediate           | '1'         | Update Module, Start Immed.
 *      update         | startDelayed             | '2'         | Update Module, Start Delayed
 *      update         | immediateStartNoRestart  | '3'         | Imm. Start, No Restart
 *
 *    Each row was verified by reading a real module with that UTASK value, e.g.
 *    PPH_MRP_AREA_CREATE_DATA (UTASK '1') answers
 *    `fmodule:processingType="update" fmodule:updateTaskKind="startImmediate"`.
 *    Note UTASK '3' is `immediateStartNoRestart`, and a remote-enabled module is
 *    `processingType="rfc"` with UTASK left blank — neither is guessable.
 *
 * 2. THE DESCRIPTION IS INTERPOLATED UNESCAPED, exactly like the function-group
 *    create that produced a blanket `Bad request: Data is invalid and could not
 *    be converted` for any description containing an XML metacharacter. Every
 *    value here is escaped.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUNCTION_MODULE_PROCESSING_TYPES = exports.CT_FUNCTION_MODULE_V3 = exports.CT_FUNCTION_MODULE = void 0;
exports.buildFunctionModuleCreateXml = buildFunctionModuleCreateXml;
exports.createFunctionModuleDirect = createFunctionModuleDirect;
exports.functionModuleUri = functionModuleUri;
exports.setFunctionModuleProcessingType = setFunctionModuleProcessingType;
exports.parseFunctionModuleProcessing = parseFunctionModuleProcessing;
exports.expectedProcessing = expectedProcessing;
const adtObjectOps_1 = require("./adtObjectOps");
const utils_1 = require("./utils");
exports.CT_FUNCTION_MODULE = 'application/vnd.sap.adt.functions.fmodules.v2+xml';
/**
 * The ONLY media type that accepts a metadata PUT on this collection. Measured:
 * v2 and v1 answer 415 `ExceptionUnsupportedMediaType`, v3 answers 200 and the
 * attributes are stored.
 */
exports.CT_FUNCTION_MODULE_V3 = 'application/vnd.sap.adt.functions.fmodules.v3+xml';
/** Media types to try, newest first — the dep pins one and never falls back. */
const FUNCTION_MODULE_CONTENT_TYPES = [
    'application/vnd.sap.adt.functions.fmodules.v2+xml',
    'application/vnd.sap.adt.functions.fmodules.v1+xml',
];
/**
 * The processing types a caller can ask for, mapped to the two ADT attributes.
 * `undefined` updateTaskKind means the attribute is omitted entirely, which is
 * how SAP's own non-update modules look.
 */
exports.FUNCTION_MODULE_PROCESSING_TYPES = {
    normal: { processingType: 'normal', updateTaskKind: undefined },
    remote: { processingType: 'rfc', updateTaskKind: undefined },
    update_start_immediate: {
        processingType: 'update',
        updateTaskKind: 'startImmediate',
    },
    update_start_delayed: {
        processingType: 'update',
        updateTaskKind: 'startDelayed',
    },
    update_immediate_no_restart: {
        processingType: 'update',
        updateTaskKind: 'immediateStartNoRestart',
    },
};
/** SAP ADT descriptions are capped at 60 characters. */
function limitDescription(description) {
    return (description ?? '').slice(0, 60);
}
/**
 * Build the function module create body with every interpolated value ESCAPED
 * and the processing type applied. Exported for unit testing.
 */
function buildFunctionModuleCreateXml(params) {
    const name = params.functionModuleName.toUpperCase();
    const group = params.functionGroupName.toUpperCase();
    const encodedGroup = (0, utils_1.encodeSapObjectName)(group).toLowerCase();
    const description = limitDescription(params.description || name);
    const kind = exports.FUNCTION_MODULE_PROCESSING_TYPES[params.processingType ?? 'normal'];
    // Omit the attributes entirely for a plain module, so the payload stays
    // byte-identical to what the dep sent for the default case.
    const processingAttr = params.processingType && params.processingType !== 'normal'
        ? ` fmodule:processingType="${(0, adtObjectOps_1.escXml)(kind.processingType)}"`
        : '';
    const updateAttr = kind.updateTaskKind
        ? ` fmodule:updateTaskKind="${(0, adtObjectOps_1.escXml)(kind.updateTaskKind)}"`
        : '';
    const masterSystemAttr = params.masterSystem
        ? ` adtcore:masterSystem="${(0, adtObjectOps_1.escXml)(params.masterSystem)}"`
        : '';
    const responsibleAttr = params.responsible
        ? ` adtcore:responsible="${(0, adtObjectOps_1.escXml)(params.responsible)}"`
        : '';
    return ('<?xml version="1.0" encoding="UTF-8"?>' +
        '<fmodule:abapFunctionModule ' +
        'xmlns:fmodule="http://www.sap.com/adt/functions/fmodules" ' +
        'xmlns:adtcore="http://www.sap.com/adt/core" ' +
        `adtcore:description="${(0, adtObjectOps_1.escXml)(description)}" ` +
        `adtcore:name="${(0, adtObjectOps_1.escXml)(name)}" ` +
        `adtcore:type="FUGR/FF"` +
        `${processingAttr}${updateAttr}${masterSystemAttr}${responsibleAttr}>` +
        `<adtcore:containerRef adtcore:name="${(0, adtObjectOps_1.escXml)(group)}" ` +
        'adtcore:type="FUGR/F" ' +
        `adtcore:uri="/sap/bc/adt/functions/groups/${encodedGroup}"/>` +
        '</fmodule:abapFunctionModule>');
}
/**
 * POST the function module, falling back through the media types on a 4xx and
 * always surfacing SAP's response body.
 */
async function createFunctionModuleDirect(connection, params) {
    const encodedGroup = (0, utils_1.encodeSapObjectName)(params.functionGroupName.toUpperCase()).toLowerCase();
    const url = `/sap/bc/adt/functions/groups/${encodedGroup}/fmodules`;
    const body = buildFunctionModuleCreateXml(params);
    const query = params.transportRequest
        ? { corrNr: params.transportRequest }
        : undefined;
    let lastError;
    for (const contentType of FUNCTION_MODULE_CONTENT_TYPES) {
        try {
            return await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'POST', 'default', body, query, { 'Content-Type': contentType, Accept: contentType });
        }
        catch (error) {
            lastError = error;
            const status = error?.response?.status;
            // Only a media-type/shape rejection is worth another attempt; a 403 or a
            // duplicate name will fail identically for every version.
            if (typeof status !== 'number' || status < 400 || status >= 500)
                throw error;
            if (status === 403 || status === 409)
                throw error;
        }
    }
    throw lastError;
}
/** ADT URI of a function module. */
function functionModuleUri(functionGroupName, functionModuleName) {
    return (`/sap/bc/adt/functions/groups/${(0, utils_1.encodeSapObjectName)(functionGroupName.toUpperCase()).toLowerCase()}` +
        `/fmodules/${(0, utils_1.encodeSapObjectName)(functionModuleName.toUpperCase()).toLowerCase()}`);
}
/**
 * Set a function module's processing type on an EXISTING module.
 *
 * This exists because SAP **silently ignores** the processing-type attributes on
 * the create POST. Measured on DM2/310: creating with
 * `fmodule:processingType="update" fmodule:updateTaskKind="startImmediate"` in
 * the body succeeds with HTTP 200 and the module reads back as
 * `processingType="normal"` — with v2 AND with v3. So the type has to be applied
 * as a separate read-modify-write on the metadata, which is what SE37 does when
 * you change the radio button on an existing module.
 *
 * The attribute only reaches TFDIR-UTASK on ACTIVATION: before activating, ADT
 * reports the new value while `TFDIR-UTASK` is still blank. Verified end to end
 * (create -> set -> activate -> `TFDIR-UTASK = '1'`).
 */
async function setFunctionModuleProcessingType(connection, functionGroupName, functionModuleName, processingType, transportRequest) {
    const uri = functionModuleUri(functionGroupName, functionModuleName);
    const kind = exports.FUNCTION_MODULE_PROCESSING_TYPES[processingType];
    await (0, adtObjectOps_1.runLocked)(connection, uri, async (lockHandle) => {
        // Read the CURRENT metadata and patch only the two attributes, so nothing
        // else about the module (description, release state, language) is rewritten
        // from a guess.
        const current = await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET');
        const xml = String(current?.data ?? '');
        if (!xml.includes('<fmodule:abapFunctionModule')) {
            throw new Error(`Could not read the metadata of function module ${functionModuleName} ` +
                'to set its processing type.');
        }
        const attrs = ` fmodule:processingType="${(0, adtObjectOps_1.escXml)(kind.processingType)}"` +
            (kind.updateTaskKind
                ? ` fmodule:updateTaskKind="${(0, adtObjectOps_1.escXml)(kind.updateTaskKind)}"`
                : '');
        const patched = xml
            .replace(/\s*fmodule:processingType="[^"]*"/, '')
            .replace(/\s*fmodule:updateTaskKind="[^"]*"/, '')
            .replace('<fmodule:abapFunctionModule', `<fmodule:abapFunctionModule${attrs}`);
        const params = { lockHandle };
        if (transportRequest)
            params.corrNr = transportRequest;
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'PUT', 'default', patched, params, 
        // v3 ONLY — v2/v1 answer 415 here.
        { 'Content-Type': exports.CT_FUNCTION_MODULE_V3 });
    });
}
/**
 * Read back `processingType`/`updateTaskKind` from a function module's metadata.
 *
 * Used to VERIFY a create rather than trust it: the whole point of the
 * processing type is a runtime behaviour, and reporting "created as an update
 * module" without checking is precisely the failure mode this repo keeps
 * removing.
 */
function parseFunctionModuleProcessing(xml) {
    return {
        processing_type: /fmodule:processingType="([^"]*)"/.exec(xml ?? '')?.[1] ?? null,
        update_task_kind: /fmodule:updateTaskKind="([^"]*)"/.exec(xml ?? '')?.[1] ?? null,
    };
}
/** The ADT attribute pair a caller's `processing_type` should produce. */
function expectedProcessing(processingType) {
    const kind = exports.FUNCTION_MODULE_PROCESSING_TYPES[processingType ?? 'normal'];
    return {
        processingType: kind.processingType,
        ...(kind.updateTaskKind ? { updateTaskKind: kind.updateTaskKind } : {}),
    };
}
//# sourceMappingURL=functionModuleCreate.js.map