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
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
/** SAP content types for the domain v2 endpoint. */
export declare const ACCEPT_DOMAIN = "application/vnd.sap.adt.domains.v2+xml, application/vnd.sap.adt.domains.v1+xml";
export declare const CT_DOMAIN = "application/vnd.sap.adt.domains.v2+xml; charset=utf-8";
/** SAP DDIC descriptions are capped at 60 characters. */
export declare function limitDescription(description: string): string;
export interface DomainContentPatch {
    description?: string;
    datatype?: string;
    length?: number;
    decimals?: number;
    conversion_exit?: string;
    lowercase?: boolean;
    sign_exists?: boolean;
    value_table?: string;
    fixed_values?: Array<{
        low: string;
        text: string;
    }>;
}
/**
 * Apply the requested changes to a domain XML document, inserting the
 * <doma:content> subtree when it is missing. Only fields that are explicitly
 * provided (not undefined) are touched.
 */
export declare function patchDomainContent(currentXml: string, patch: DomainContentPatch): string;
/**
 * Write domain content via read-modify-write against the ADT domain endpoint.
 *
 * The domain must already be locked (pass the lock handle). Reads the current
 * server XML, applies {@link patchDomainContent} (which inserts the
 * <doma:content> subtree when the domain was just created bare), and PUTs it
 * back. Replaces the equivalent step in @mcp-abap-adt/adt-clients, whose regex
 * patch cannot insert the missing type-information subtree.
 */
export declare function writeDomainContent(connection: IAbapConnection, domainName: string, patch: DomainContentPatch, lockHandle: string, transportRequest?: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
//# sourceMappingURL=domainXml.d.ts.map