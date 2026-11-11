"use strict";
/**
 * CallIcfService — one authenticated HTTP call against the connected SAP system.
 *
 * See src/lib/icfCall.ts for why this exists and how its scope was decided.
 * It is registered in the HIGH group only: even a GET here is not `readonly` in
 * the sense the readonly group promises, because the path allow-list covers
 * OData services whose GETs can have side effects (function imports, actions).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCallIcfService = handleCallIcfService;
const icfCall_1 = require("../../../lib/icfCall");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'CallIcfService',
    available_in: ['onprem', 'cloud'],
    description: '[service] Make ONE authenticated HTTP call against the SAME SAP system this server is ' +
        'connected to, reusing its connection, client, cookies and CSRF token. Use it to exercise ' +
        'what you have built — OData V4/V2 services, an ICF endpoint, UI5 resources. Pass an ' +
        'absolute PATH, not a URL: the host is never selectable. ' +
        `Reachable prefixes: ${icfCall_1.ICF_ALLOWED_PREFIXES.join(', ')}; /sap/bc/adt/* is NOT. ` +
        'You may NOT pass an authorization, cookie or x-csrf-token header, and none is ever ' +
        'returned or logged. Returns resolved_url, status, scrubbed headers and body ' +
        `(capped at ${icfCall_1.ICF_MAX_RESPONSE_BYTES} chars, body_truncated when it did not fit). ` +
        'See Notes.',
    inputSchema: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'Absolute path on the connected system, e.g. ' +
                    '"/sap/opu/odata4/sap/zsrvb/srvd_a2x/sap/zsd/0001/Entity" or ' +
                    '"/sap/bc/http/sap/zmy_if". Must start with "/" and match an allowed prefix. ' +
                    'A full URL is rejected.',
            },
            method: {
                type: 'string',
                enum: icfCall_1.ICF_METHODS,
                description: 'HTTP method. Default GET.',
            },
            body: {
                type: 'string',
                description: `Request body as a string (JSON, XML, form data). Max ${icfCall_1.ICF_MAX_REQUEST_BYTES} characters. ` +
                    'Set Content-Type in headers to match.',
            },
            query: {
                type: 'object',
                description: 'Query parameters as a flat object. sap-client is supplied by the connection.',
                additionalProperties: true,
            },
            headers: {
                type: 'object',
                description: 'Extra request headers, e.g. {"Accept": "application/json"}. authorization, ' +
                    'cookie, x-csrf-token and proxy-authorization are REFUSED — the connection ' +
                    'supplies authentication.',
                additionalProperties: { type: 'string' },
            },
        },
        required: ['path'],
    },
    notes: `OData V4 service roots: the segment after the binding name is the REPOSITORY, and it is not the same
for every binding — a UI service binding resolves to /srvd/ while an A2X / Web-API binding resolves
to /srvd_a2x/. The example above shows srvd_a2x; copying it for a UI binding answers
403 "Service '<SRVD>' repository 'SRVD_A2X' is not assigned to group '<binding>'", which names
neither the cause nor the fix. Do not guess the shape: GetServiceBinding returns the resolved
service_root and repository_id straight from SAP.

/sap/bc/adt/* is deliberately unreachable: ADT is covered by the typed tools in
this server, and a generic passthrough would be an unaudited second route to the
same API. The deny check runs BEFORE the allow-list, so it cannot be reached via
a /sap/bc/ prefix match, and the path is percent-decoded to a fixed point before
any check — ICF resolves encoded dot segments, so %2e%2e and %252e%252e are
refused along with a literal "..". Ordinary encoding survives: the ORIGINAL
string is what gets sent, so an OData key predicate like Set('A%20B') still
reaches the service.

Credentials cannot go in or come out. authorization, cookie, x-csrf-token and
proxy-authorization are refused as ARGUMENTS — an error, not a silent override,
so no credential lands in the conversation or the log. On the way back
set-cookie, authorization, x-csrf-token, www-authenticate and proxy-authenticate
come back as [redacted] with the KEY kept, so a reader can still see that a
cookie was set. Only the method and path are logged.

An HTTP error is a RESULT, not a tool failure: a 404 or 500 from the service
under test is what you are trying to observe, so it comes back as success:false
with the status and body rather than an exception that swallows them.`,
};
async function handleCallIcfService(context, args) {
    const { connection, logger } = context;
    const path = args?.path;
    const method = (args?.method || 'GET').toUpperCase();
    try {
        const pathCheck = (0, icfCall_1.checkIcfPath)(path);
        if (!pathCheck.ok) {
            return (0, utils_1.return_error)(new Error(pathCheck.reason));
        }
        if (!icfCall_1.ICF_METHODS.includes(method)) {
            return (0, utils_1.return_error)(new Error(`Unsupported method "${args?.method}". Supported: ${icfCall_1.ICF_METHODS.join(', ')}.`));
        }
        const headerCheck = (0, icfCall_1.checkIcfHeaders)(args?.headers);
        if (!headerCheck.ok) {
            return (0, utils_1.return_error)(new Error(headerCheck.reason));
        }
        if (args?.body && args.body.length > icfCall_1.ICF_MAX_REQUEST_BYTES) {
            return (0, utils_1.return_error)(new Error(`Request body is ${args.body.length} characters, over the ${icfCall_1.ICF_MAX_REQUEST_BYTES} limit.`));
        }
        // Log the path and method, never the headers or body: this tool's traffic
        // can carry business payloads and the log is not the place for them.
        logger?.info(`CallIcfService ${method} ${path}`);
        const result = await (0, icfCall_1.callIcfService)(connection, {
            path: path.trim(),
            method,
            body: args?.body,
            params: args?.query,
            headers: args?.headers,
        });
        return (0, utils_1.return_response)({
            data: JSON.stringify({ success: true, ...result }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        // An HTTP error is a RESULT here, not a tool failure: a 404 or a 500 from
        // the service under test is exactly what the caller is trying to observe,
        // and turning it into an exception would hide the body that explains it.
        const status = error?.response?.status;
        if (typeof status === 'number') {
            const raw = error.response?.data;
            const body = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : '';
            logger?.warn(`CallIcfService ${method} ${path} -> HTTP ${status}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: false,
                    status,
                    status_text: error.response?.statusText,
                    method,
                    path,
                    headers: (0, icfCall_1.scrubResponseHeaders)(error.response?.headers),
                    body: body.slice(0, icfCall_1.ICF_MAX_RESPONSE_BYTES),
                    body_bytes: body.length,
                    body_truncated: body.length > icfCall_1.ICF_MAX_RESPONSE_BYTES,
                    message: `The service answered HTTP ${status}. This is the service's own response, ` +
                        'not a failure of the call itself.',
                }, null, 2),
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            });
        }
        const message = error instanceof Error ? error.message : String(error);
        logger?.error(`CallIcfService ${method} ${path} failed: ${message}`);
        return (0, utils_1.return_error)(new Error(`CallIcfService failed: ${message}`));
    }
}
//# sourceMappingURL=handleCallIcfService.js.map