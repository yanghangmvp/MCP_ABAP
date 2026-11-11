"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICF_MAX_RESPONSE_BYTES = exports.ICF_MAX_REQUEST_BYTES = exports.ICF_METHODS = exports.ICF_DENIED_PREFIXES = exports.ICF_ALLOWED_PREFIXES = void 0;
exports.decodeIcfPath = decodeIcfPath;
exports.checkIcfPath = checkIcfPath;
exports.checkIcfHeaders = checkIcfHeaders;
exports.scrubResponseHeaders = scrubResponseHeaders;
exports.describeResolvedUrl = describeResolvedUrl;
exports.callIcfService = callIcfService;
const utils_1 = require("./utils");
/**
 * Prefixes this tool may call, from the reporter's own measured usage:
 * OData V4 services (7 hits), the framework's ICF endpoint (5), UI5 resources
 * the Fiori apps proxy (3), and the UI5 bootstrap (3).
 */
exports.ICF_ALLOWED_PREFIXES = [
    '/sap/opu/odata4/',
    '/sap/opu/odata/',
    '/sap/bc/http/',
    '/sap/bc/ui5_ui5/',
    '/sap/public/bc/',
];
/**
 * Denied even though `/sap/bc/http/` and friends are allowed: ADT has typed
 * tools in this server, and a generic passthrough would be an unaudited second
 * way in.
 */
exports.ICF_DENIED_PREFIXES = ['/sap/bc/adt/'];
exports.ICF_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
];
/** Caller-supplied headers that would carry or override a credential. */
const FORBIDDEN_REQUEST_HEADERS = [
    'authorization',
    'cookie',
    'x-csrf-token',
    'proxy-authorization',
];
/** Response headers scrubbed before anything is returned or logged. */
const SENSITIVE_RESPONSE_HEADERS = [
    'set-cookie',
    'cookie',
    'authorization',
    'x-csrf-token',
    'www-authenticate',
    'proxy-authenticate',
];
exports.ICF_MAX_REQUEST_BYTES = 1_000_000;
exports.ICF_MAX_RESPONSE_BYTES = 200_000;
/** How many decode rounds before we call a path pathological and refuse it. */
const ICF_MAX_DECODE_ROUNDS = 5;
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
function decodeIcfPath(path) {
    let current = path;
    for (let round = 0; round < ICF_MAX_DECODE_ROUNDS; round++) {
        let next;
        try {
            next = decodeURIComponent(current);
        }
        catch {
            return {
                ok: false,
                reason: 'path contains an invalid percent-encoding and cannot be decoded, so it ' +
                    'cannot be checked against the allow-list.',
            };
        }
        if (next === current)
            return { ok: true, decoded: current };
        current = next;
    }
    return {
        ok: false,
        reason: `path is percent-encoded more than ${ICF_MAX_DECODE_ROUNDS} levels deep. ` +
            'Nothing legitimate needs that; it is refused rather than decoded further.',
    };
}
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
function checkIcfPath(path) {
    if (typeof path !== 'string' || path.trim() === '') {
        return { ok: false, reason: 'path is required.' };
    }
    const trimmed = path.trim();
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
        return {
            ok: false,
            reason: 'Pass an absolute PATH, not a full URL. This tool always calls the system this ' +
                'server is connected to; the host is not selectable.',
        };
    }
    if (!trimmed.startsWith('/')) {
        return { ok: false, reason: 'path must start with "/".' };
    }
    const decoded = decodeIcfPath(trimmed);
    if (!decoded.ok) {
        return { ok: false, reason: decoded.reason };
    }
    // Re-test the shape on the decoded form: `%2f%2fhost` and `%3a%2f%2f` can
    // spell a scheme or a protocol-relative URL that the literal test above did
    // not see.
    const plain = decoded.decoded;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(plain) || plain.startsWith('//')) {
        return {
            ok: false,
            reason: 'path decodes to a URL or a protocol-relative reference. Pass an absolute ' +
                'PATH; the host is not selectable.',
        };
    }
    if (!plain.startsWith('/')) {
        return {
            ok: false,
            reason: 'path must decode to a path starting with "/".',
        };
    }
    // `..` would otherwise walk out of an allowed prefix and into /sap/bc/adt/.
    // Tested on the DECODED form: the literal spelling is the one nobody uses.
    if (plain.includes('..')) {
        return {
            ok: false,
            reason: 'path may not contain ".." in any encoding. ICF resolves percent-encoded dot ' +
                'segments, so a traversal would leave the allow-list even though the path ' +
                'starts inside it.',
        };
    }
    const lower = plain.toLowerCase();
    for (const denied of exports.ICF_DENIED_PREFIXES) {
        if (lower.startsWith(denied)) {
            return {
                ok: false,
                reason: `${denied}* is deliberately NOT reachable through this tool. ADT is covered by ` +
                    'the typed tools in this server; a generic passthrough would be an unaudited ' +
                    'second route to the same API.',
            };
        }
    }
    if (!exports.ICF_ALLOWED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
        return {
            ok: false,
            reason: `Path is outside the allow-list. Allowed prefixes: ${exports.ICF_ALLOWED_PREFIXES.join(', ')}.`,
        };
    }
    return { ok: true };
}
function checkIcfHeaders(headers) {
    if (!headers)
        return { ok: true };
    for (const name of Object.keys(headers)) {
        if (FORBIDDEN_REQUEST_HEADERS.includes(name.toLowerCase())) {
            return {
                ok: false,
                reason: `Header "${name}" may not be supplied. Authentication is taken from this server's ` +
                    'own connection; passing a credential through a tool argument would put it in the ' +
                    'conversation and in the logs.',
            };
        }
    }
    return { ok: true };
}
function scrubResponseHeaders(headers) {
    const out = {};
    if (!headers || typeof headers !== 'object')
        return out;
    for (const [name, value] of Object.entries(headers)) {
        if (SENSITIVE_RESPONSE_HEADERS.includes(name.toLowerCase())) {
            out[name] = '[redacted]';
            continue;
        }
        out[name] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return out;
}
/**
 * The URL as actually sent, for the response.
 *
 * The reporter asked for this explicitly, and the reason is good: their ten
 * wasted `curl` rounds were all about WHICH url answered. A tool that hides the
 * url it used would reproduce that problem inside the tool.
 */
function describeResolvedUrl(baseUrl, path, params) {
    const base = baseUrl.replace(/\/+$/, '');
    const query = params
        ? Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
    return `${base}${path}${query ? (path.includes('?') ? '&' : '?') + query : ''}`;
}
function stringifyBody(data) {
    if (data === undefined || data === null)
        return '';
    if (typeof data === 'string')
        return data;
    if (Buffer.isBuffer(data))
        return data.toString('utf-8');
    try {
        return JSON.stringify(data);
    }
    catch {
        return String(data);
    }
}
async function callIcfService(connection, options) {
    const baseUrl = await connection.getBaseUrl();
    const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, options.path, options.method, 
    // A modifying call needs the CSRF handshake the connection performs; the
    // longer budget is also right for a service call, which can be slower than
    // an ADT metadata read.
    options.timeoutMs ?? (options.method === 'GET' ? 'default' : 'csrf'), options.body, options.params, options.headers);
    const full = stringifyBody(response.data);
    const truncated = full.length > exports.ICF_MAX_RESPONSE_BYTES;
    return {
        status: response.status,
        status_text: response.statusText,
        resolved_url: describeResolvedUrl(baseUrl, options.path, options.params),
        method: options.method,
        headers: scrubResponseHeaders(response.headers),
        body: truncated ? full.slice(0, exports.ICF_MAX_RESPONSE_BYTES) : full,
        body_bytes: full.length,
        body_truncated: truncated,
    };
}
//# sourceMappingURL=icfCall.js.map