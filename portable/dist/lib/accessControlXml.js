"use strict";
/**
 * Access control (DCL / DCLS) ADT contract.
 *
 * A DCL source defines a CDS access control role — the authorization layer over
 * a CDS view:
 *
 * ```
 * @EndUserText.label: 'Authorization for Z_MY_VIEW'
 * @MappingRole: true
 * define role Z_MY_VIEW {
 *   grant select on Z_MY_VIEW
 *     where ( CompanyCode ) = aspect pfcg_auth( F_BKPF_BUK, BUKRS, ACTVT = '03' );
 * }
 * ```
 *
 * VERIFIED LIVE against /sap/bc/adt/discovery on S/4 7.56 (DM2). The system
 * advertises the collection with:
 *   href      /sap/bc/adt/acm/dcl/sources
 *   accept    application/vnd.sap.adt.dclSource+xml   (the ONLY accepted type)
 *   properties  /sap/bc/adt/acm/dcl/sources/{object_name}{?corrNr,lockHandle,version,accessMode,_action}
 *   source      /sap/bc/adt/acm/dcl/sources/{object_name}/source/main{?corrNr,lockHandle,version}
 *   validation  /sap/bc/adt/acm/dcl/validation{?objname,packagename,description,template}
 * and a real object read back with adtcore:type="DCLS/DL".
 *
 * WHY THIS IS IN-REPO RATHER THAN THE DEP. `@mcp-abap-adt/adt-clients` does
 * ship a full `core/accessControl` client, but it carries all three bugs this
 * round was about:
 *   1. `create.js` interpolates the description into the XML WITHOUT escaping
 *      ("no escaping" is also what made CreateFunctionGroup 400 on any
 *      description containing & < > ");
 *   2. `delete.js` spreads the real response and then OVERWRITES `data` with a
 *      hardcoded `{ success: true, message: "… deleted successfully" }`, so
 *      SAP's `del:isDeleted="false"` and its reasons are unreachable (the exact
 *      `deleteStructure` defect);
 *   3. `activation.js` decides success as `activationExecuted && checkExecuted`
 *      and DISCARDS the messages — SAP reports `activationExecuted="true"` even
 *      for objects it rejected, so a refused activation reads as success.
 * The handlers therefore use the shared in-repo primitives (adtObjectOps /
 * adtMessages / adtDeletion) instead, the same bypass pattern as XSLT, MSAG,
 * ENQU and TTYP.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_CONTROL_TYPE = exports.CT_ACCESS_CONTROL = void 0;
exports.accessControlUri = accessControlUri;
exports.buildAccessControlCreateXml = buildAccessControlCreateXml;
const adtObjectOps_1 = require("./adtObjectOps");
const utils_1 = require("./utils");
/** The ONLY media type this collection accepts (confirmed via discovery). */
exports.CT_ACCESS_CONTROL = 'application/vnd.sap.adt.dclSource+xml';
/** ADT object type code for a DCL source. */
exports.ACCESS_CONTROL_TYPE = 'DCLS/DL';
/** Object URI for a DCL source. */
function accessControlUri(name) {
    return `/sap/bc/adt/acm/dcl/sources/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
}
/**
 * Build the bare create body: root element + packageRef. The source is written
 * by a follow-up PUT to `<uri>/source/main`, exactly as the collection's
 * templateLinks describe.
 *
 * Every interpolated value is escaped. `adtcore:description` is capped at the
 * 60 characters ADT allows.
 */
function buildAccessControlCreateXml(params) {
    const name = params.name.toUpperCase();
    const lang = (params.masterLanguage || 'EN').toUpperCase();
    const description = (params.description || name).slice(0, 60);
    const optional = (params.masterSystem
        ? ` adtcore:masterSystem="${(0, adtObjectOps_1.escXml)(params.masterSystem)}"`
        : '') +
        (params.responsible
            ? ` adtcore:responsible="${(0, adtObjectOps_1.escXml)(params.responsible)}"`
            : '');
    return ('<?xml version="1.0" encoding="UTF-8"?>' +
        '<dcl:dclSource xmlns:dcl="http://www.sap.com/adt/acm/dclsources"' +
        ' xmlns:adtcore="http://www.sap.com/adt/core"' +
        ` adtcore:description="${(0, adtObjectOps_1.escXml)(description)}"` +
        ` adtcore:language="${(0, adtObjectOps_1.escXml)(lang)}"` +
        ` adtcore:name="${(0, adtObjectOps_1.escXml)(name)}"` +
        ` adtcore:type="${exports.ACCESS_CONTROL_TYPE}"` +
        ` adtcore:masterLanguage="${(0, adtObjectOps_1.escXml)(lang)}"` +
        `${optional}>` +
        `<adtcore:packageRef adtcore:name="${(0, adtObjectOps_1.escXml)(params.packageName.toUpperCase())}"/>` +
        '</dcl:dclSource>');
}
//# sourceMappingURL=accessControlXml.js.map