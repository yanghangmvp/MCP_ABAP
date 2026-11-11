/**
 * Authenticated HTTP calls against the SAME SAP system the MCP is already
 * connected to.
 *
 * WHY THIS EXISTS (field report round 3, tier 3; scoped by their round-4
 * answers). For a project whose deliverable is a SERVICE rather than a class,
 * the entire outer half of verification happened outside the MCP: calling the
 * framework's own ICF endpoint, driving the OData V4 services, running two
 * concurrent authenticated sessions. That became `curl` loops, an
 * `it-concurrency.py`, an `it-routing.py`, a 35-request `.http` file and a
 * Fiori acceptance harness — four assets that exist only because the MCP could
 * not make one authenticated call. About ten of those `curl` rounds were spent
 * rediscovering which host and port answered and what `www-authenticate` it
 * sent: knowledge this server already holds.
 *
 * SCOPE — decided by the reporter, not inferred:
 *   - same configured host only;
 *   - a PATH ALLOW-LIST of four prefixes (their measured usage), not one;
 *   - `/sap/bc/adt/*` is EXCLUDED even though it sits under `/sap/bc/`, so this
 *     cannot become a second, unaudited route to the ADT API that the rest of
 *     this server already covers with typed tools;
 *   - all methods;
 *   - `high` group only — not `readonly`, not even for GET.
 *
 * CREDENTIALS NEVER LEAVE THIS FILE. The connection supplies authentication; a
 * caller may not pass an `authorization` header (attempting to is an error, not
 * a silent override), and every credential-bearing header is stripped from the
 * response before it is returned or logged. The response of this tool is
 * expected to be pasted around by whoever is reading it.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
/**
 * Prefixes this tool may call, from the reporter's own measured usage:
 * OData V4 services (7 hits), the framework's ICF endpoint (5), UI5 resources
 * the Fiori apps proxy (3), and the UI5 bootstrap (3).
 */
export declare const ICF_ALLOWED_PREFIXES: readonly ["/sap/opu/odata4/", "/sap/opu/odata/", "/sap/bc/http/", "/sap/bc/ui5_ui5/", "/sap/public/bc/"];
/**
 * Denied even though `/sap/bc/http/` and friends are allowed: ADT has typed
 * tools in this server, and a generic passthrough would be an unaudited second
 * way in.
 */
export declare const ICF_DENIED_PREFIXES: readonly ["/sap/bc/adt/"];
export declare const ICF_METHODS: readonly ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];
export type IcfMethod = (typeof ICF_METHODS)[number];
export declare const ICF_MAX_REQUEST_BYTES = 1000000;
export declare const ICF_MAX_RESPONSE_BYTES = 200000;
export interface IcfPathCheck {
    ok: boolean;
    reason?: string;
}
export interface IcfDecodeResult {
    ok: boolean;
    decoded?: string;
    reason?: string;
}
/**
 * Percent-decode until the string stops changing.
 *
 * WHY (field report round 5/6, F-1). The first version of `checkIcfPath` rejected a
 * literal `..` and nothing else. ICF normalises percent-encoded dot segments,
 * so `%2e%2e` sailed through the guard and the server resolved it anyway:
 *
 *     /sap/opu/odata4/%2e%2e/%2e%2e/bc/adt/discovery  ->  HTTP 200,
 *     byte-identical to /sap/bc/adt/discovery, which this tool refuses outright.
 *
 * Two allow-listed prefixes both landed on the ADT discovery document, and
 * `/sap/opu/odata4/%2e%2e/%2e%2e/public/ping` reached a path outside the
 * allow-list entirely. So the guard caught exactly the spelling nobody would
 * write by accident.
 *
 * Decoding to a FIXED POINT rather than once also closes `%252e` (which decodes
 * to `%2e`, then to `.`). The checks run against this decoded form; the ORIGINAL
 * string is what gets sent, so a legitimate OData key predicate such as
 * `Set('A%20B')` still reaches the service exactly as the caller wrote it.
 */
export declare function decodeIcfPath(path: string): IcfDecodeResult;
/**
 * Accept only an absolute path on the configured host.
 *
 * A full URL is rejected rather than parsed-and-compared: allowing one invites
 * "but it is the same host with a different port / a redirect", and the whole
 * point is that the destination is not the caller's to choose.
 *
 * Every check below runs against the DECODED path (see `decodeIcfPath`) as well
 * as the literal one, because the server decodes before it routes.
 */
export declare function checkIcfPath(path: string): IcfPathCheck;
export declare function checkIcfHeaders(headers: Record<string, string> | undefined): IcfPathCheck;
export declare function scrubResponseHeaders(headers: unknown): Record<string, string>;
/**
 * The URL as actually sent, for the response.
 *
 * The reporter asked for this explicitly, and the reason is good: their ten
 * wasted `curl` rounds were all about WHICH url answered. A tool that hides the
 * url it used would reproduce that problem inside the tool.
 */
export declare function describeResolvedUrl(baseUrl: string, path: string, params?: Record<string, unknown>): string;
export interface IcfCallResult {
    status: number;
    status_text?: string;
    resolved_url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    body_bytes: number;
    body_truncated: boolean;
}
export declare function callIcfService(connection: IAbapConnection, options: {
    path: string;
    method: IcfMethod;
    body?: string;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeoutMs?: number;
}): Promise<IcfCallResult>;
//# sourceMappingURL=icfCall.d.ts.map