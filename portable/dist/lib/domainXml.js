"use strict";
/**
 * Robust read-modify-write helpers for ABAP Domain (DDIC) XML.
 *
 * Background / why this exists
 * ----------------------------
 * A domain is created with a *bare* POST (root element + packageRef only), so
 * the freshly created object has no <doma:content> block yet. The type
 * information (datatype / length / decimals) and the description then have to
 * be written with a follow-up PUT.
 *
 * The regex "patch existing element" approach can only *replace* elements that
 * are already present in the GET response — it silently no-ops when the
 * <doma:content>/<doma:typeInformation> subtree is missing. That is exactly why
 * description / length / datatype were not being persisted on freshly created
 * domains.
 *
 * These helpers instead parse the XML, ensure the required nodes exist
 * (inserting them when missing), set the requested values, and serialize the
 * whole document back. Everything the server returned that we do not touch is
 * preserved.
 *
 * Confirmed structure (see @mcp-abap-adt/adt-clients getDomainInfo):
 *   <doma:domain adtcore:description="...">
 *     <adtcore:packageRef .../>
 *     <doma:content>
 *       <doma:typeInformation>
 *         <doma:datatype>CHAR</doma:datatype>
 *         <doma:length>10</doma:length>
 *         <doma:decimals>0</doma:decimals>
 *       </doma:typeInformation>
 *       <doma:outputInformation>
 *         <doma:conversionExit/> <doma:signExists/> <doma:lowercase/> ...
 *       </doma:outputInformation>
 *       <doma:valueInformation>
 *         <doma:valueTableRef adtcore:name="..."/>
 *         <doma:fixValues> <doma:fixValue> <doma:low/> <doma:text/> ... </doma:fixValues>
 *       </doma:valueInformation>
 *     </doma:content>
 *   </doma:domain>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CT_DOMAIN = exports.ACCEPT_DOMAIN = void 0;
exports.limitDescription = limitDescription;
exports.patchDomainContent = patchDomainContent;
exports.writeDomainContent = writeDomainContent;
const fast_xml_parser_1 = require("fast-xml-parser");
const utils_1 = require("./utils");
/** SAP content types for the domain v2 endpoint. */
exports.ACCEPT_DOMAIN = 'application/vnd.sap.adt.domains.v2+xml, application/vnd.sap.adt.domains.v1+xml';
exports.CT_DOMAIN = 'application/vnd.sap.adt.domains.v2+xml; charset=utf-8';
/** SAP DDIC descriptions are capped at 60 characters. */
function limitDescription(description) {
    return (description ?? '').slice(0, 60);
}
const PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Drop the <?xml ?> prolog on parse so the builder does not re-emit it; we
    // prepend exactly one declaration ourselves (otherwise the output carries a
    // duplicate prolog, which SAP rejects).
    ignoreDeclaration: true,
    // Keep every value as-is (strings). Domains store e.g. "000010"/"CHAR";
    // we never want numeric coercion to rewrite those.
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
};
const BUILDER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    suppressEmptyNode: true,
    // MUST stay false. fast-xml-parser defaults suppressBooleanAttributes to
    // TRUE, which rewrites any attribute whose value is the string "true" into a
    // VALUELESS attribute: `ttyp:isVisible="true"` becomes `ttyp:isVisible`.
    // SAP's XML parser then rejects the document — observed live as
    // `400 ExceptionInvalidData: System expected end of element ... tableType`
    // pointing at the element carrying such an attribute. HTML tolerates
    // valueless attributes; XML does not.
    suppressBooleanAttributes: false,
    format: false,
};
/** Coerce a parsed node into a mutable object, replacing scalar/empty nodes. */
function asObject(parent, key) {
    const current = parent[key];
    if (current && typeof current === 'object' && !Array.isArray(current)) {
        return current;
    }
    const obj = {};
    parent[key] = obj;
    return obj;
}
/**
 * Apply the requested changes to a domain XML document, inserting the
 * <doma:content> subtree when it is missing. Only fields that are explicitly
 * provided (not undefined) are touched.
 */
function patchDomainContent(currentXml, patch) {
    const parser = new fast_xml_parser_1.XMLParser(PARSER_OPTIONS);
    const parsed = parser.parse(currentXml);
    const root = parsed['doma:domain'];
    if (!root || typeof root !== 'object') {
        throw new Error('Unexpected domain XML: <doma:domain> root element not found');
    }
    // Description lives on the root element as an attribute.
    if (patch.description !== undefined) {
        root['@_adtcore:description'] = limitDescription(patch.description);
    }
    const wantsType = patch.datatype !== undefined ||
        patch.length !== undefined ||
        patch.decimals !== undefined;
    const wantsOutput = patch.conversion_exit !== undefined ||
        patch.sign_exists !== undefined ||
        patch.lowercase !== undefined;
    const wantsValue = patch.value_table !== undefined || patch.fixed_values !== undefined;
    if (wantsType || wantsOutput || wantsValue) {
        const content = asObject(root, 'doma:content');
        if (wantsType) {
            const type = asObject(content, 'doma:typeInformation');
            if (patch.datatype !== undefined)
                type['doma:datatype'] = patch.datatype;
            if (patch.length !== undefined)
                type['doma:length'] = String(patch.length);
            if (patch.decimals !== undefined)
                type['doma:decimals'] = String(patch.decimals);
        }
        if (wantsOutput) {
            const output = asObject(content, 'doma:outputInformation');
            if (patch.conversion_exit !== undefined)
                output['doma:conversionExit'] = patch.conversion_exit || '';
            if (patch.sign_exists !== undefined)
                output['doma:signExists'] = String(patch.sign_exists);
            if (patch.lowercase !== undefined)
                output['doma:lowercase'] = String(patch.lowercase);
        }
        if (wantsValue) {
            const value = asObject(content, 'doma:valueInformation');
            if (patch.value_table !== undefined) {
                value['doma:valueTableRef'] = {
                    '@_adtcore:name': patch.value_table || '',
                };
            }
            if (patch.fixed_values !== undefined) {
                value['doma:fixValues'] =
                    patch.fixed_values.length > 0
                        ? {
                            'doma:fixValue': patch.fixed_values.map((fv) => ({
                                'doma:low': fv.low,
                                'doma:text': fv.text,
                            })),
                        }
                        : '';
            }
        }
    }
    const builder = new fast_xml_parser_1.XMLBuilder(BUILDER_OPTIONS);
    const body = builder.build(parsed);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
/**
 * Write domain content via read-modify-write against the ADT domain endpoint.
 *
 * The domain must already be locked (pass the lock handle). Reads the current
 * server XML, applies {@link patchDomainContent} (which inserts the
 * <doma:content> subtree when the domain was just created bare), and PUTs it
 * back. Replaces the equivalent step in @mcp-abap-adt/adt-clients, whose regex
 * patch cannot insert the missing type-information subtree.
 */
async function writeDomainContent(connection, domainName, patch, lockHandle, transportRequest) {
    const encoded = (0, utils_1.encodeSapObjectName)(domainName.toLowerCase());
    const url = `/sap/bc/adt/ddic/domains/${encoded}`;
    const getResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'GET', 'default', undefined, undefined, { Accept: exports.ACCEPT_DOMAIN });
    const currentXml = typeof getResp.data === 'string' ? getResp.data : String(getResp.data);
    const updatedXml = patchDomainContent(currentXml, patch);
    const params = { lockHandle };
    if (transportRequest)
        params.corrNr = transportRequest;
    return (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'PUT', 'default', updatedXml, params, { Accept: exports.ACCEPT_DOMAIN, 'Content-Type': exports.CT_DOMAIN });
}
//# sourceMappingURL=domainXml.js.map