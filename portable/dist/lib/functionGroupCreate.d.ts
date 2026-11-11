/**
 * Function group creation — in-repo bypass of the adt-clients dep.
 *
 * WHY: the dep builds the create payload by string interpolation with the
 * comment "Build XML payload - no escaping (same as old working code)"
 * (core/functionGroup/create.js). So a description containing an XML
 * metacharacter produces a MALFORMED document and ADT answers
 *
 *     Bad request: Data is invalid and could not be converted
 *
 * REPRODUCED LIVE on SAP_BASIS 7.56: `CreateFunctionGroup` with the description
 * `Probe B: A & B "quoted" <tag>` fails with exactly that message, while the
 * same call with a plain (or purely Chinese) description succeeds. That is the
 * same error text reported for a system where every CreateFunctionGroup call
 * failed.
 *
 * Two further robustness measures, because the dep pins ONE content-type
 * version (`application/vnd.sap.adt.functions.groups.v3+xml`) while sending a
 * v1/v2-shaped body — a combination a different release may refuse:
 *
 *  - on a 4xx the POST is retried with the v2 and v1 media types before giving
 *    up (same idea as advertising both SRVB versions in Accept);
 *  - the ADT response body is always surfaced, so the next failure reports
 *    SAP's own words instead of a bare "Bad request".
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { type AxiosResponse } from './utils';
export interface FunctionGroupCreateParams {
    functionGroupName: string;
    packageName: string;
    description?: string;
    masterLanguage?: string;
    masterSystem?: string;
    responsible?: string;
    transportRequest?: string;
}
/**
 * Build the function group create body with every interpolated value ESCAPED.
 * Exported for unit testing — the escaping is the whole point.
 */
export declare function buildFunctionGroupCreateXml(params: FunctionGroupCreateParams): string;
/**
 * POST a new function group, escaping the payload and falling back through the
 * known content-type versions on a 4xx.
 *
 * Returns the successful response. Throws an Error whose message carries the
 * HTTP status, the media types tried and SAP's own response body.
 */
export declare function createFunctionGroupDirect(connection: IAbapConnection, params: FunctionGroupCreateParams): Promise<AxiosResponse>;
//# sourceMappingURL=functionGroupCreate.d.ts.map