"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetServiceBinding = handleGetServiceBinding;
const fast_xml_parser_1 = require("fast-xml-parser");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const serviceBindingPayloadUtils_1 = require("./serviceBindingPayloadUtils");
exports.TOOL_DEFINITION = {
    name: 'GetServiceBinding',
    available_in: ['onprem', 'cloud'],
    description: 'Retrieve ABAP service binding source/metadata by name via ADT Business Services endpoint, plus the RESOLVED service root URL (service_root) for a published binding — the path to call for $metadata or an entity set, taken from SAP rather than guessed.',
    notes: `service_root is NOT derived. The binding document itself does not carry a URL, so the
handler follows the binding's own OData category link — GET /sap/bc/adt/businessservices/odatav4/{name}
?servicename={name} (Accept application/vnd.sap.adt.businessservices.odatav4.v1+xml), or the odatav2
equivalent with .odatav2.v2+xml — and reports what SAP answers there.

That answer carries odatav4:serviceUrl (the complete root), odatav4:serviceUrlPrefix,
odatav4:repositoryId and the entity collections with their isRoot flag. repositoryId is the segment
that cannot be guessed: a UI binding resolves to SRVD and an A2X/Web-API binding to SRVD_A2X, so a
caller copying the shape of somebody else's URL gets

    403 Service '<SRVD>' repository 'SRVD_A2X' is not assigned to group '<binding>'

Measured on S/4HANA 2023 FPS02: an ODATA_V4_WEB_API binding answers repositoryId SRVD_A2X and
serviceUrl /sap/opu/odata4/sap/<binding>/srvd_a2x/sap/<service>/0001/. The V2 endpoint answers 200
with empty values for a V4 binding, so the version is taken from the binding's own srvb:binding.

An unpublished binding has no root: service_root is null and service_root_note says why. A failure
to resolve it never fails the read — the binding document is still returned, with the reason in
service_root_note.`,
    inputSchema: {
        type: 'object',
        properties: {
            service_binding_name: {
                type: 'string',
                description: 'Service binding name (for example: ZUI_MY_BINDING). Case-insensitive.',
            },
            response_format: {
                type: 'string',
                enum: ['xml', 'json', 'plain'],
                description: 'Preferred response format. "json" requests JSON from endpoint, "xml" parses XML payload, "plain" returns raw text.',
                default: 'xml',
            },
        },
        required: ['service_binding_name'],
    },
};
const PARSER = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseAttributeValue: false,
    trimValues: true,
});
function arr(x) {
    if (x == null)
        return [];
    return Array.isArray(x) ? x : [x];
}
/** OData version the binding declares: "V4" (default) or "V2". */
function bindingODataVersion(bindingXml) {
    return /srvb:version="V2"/i.test(bindingXml) ? 'V2' : 'V4';
}
/**
 * Ask SAP for the binding's service root instead of building one.
 *
 * A URL assembled from binding + service definition names is wrong for half of
 * all bindings: the repository segment is SRVD for a UI binding and SRVD_A2X for
 * an A2X/Web-API one, and getting it wrong is a 403 that names neither cause.
 * The OData category resource knows, so it is asked. Never throws — a binding
 * that cannot be resolved still returns its document, with the reason attached.
 */
async function resolveServiceRoot(context, bindingName, version) {
    const category = version === 'V2' ? 'odatav2' : 'odatav4';
    const accept = version === 'V2'
        ? 'application/vnd.sap.adt.businessservices.odatav2.v2+xml'
        : 'application/vnd.sap.adt.businessservices.odatav4.v1+xml';
    try {
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(context.connection, `/sap/bc/adt/businessservices/${category}/${bindingName}`, 'GET', 'default', undefined, 
        // Required: without it the endpoint answers 400 ExceptionParameterNotFound
        // "Parameter servicename could not be found."
        { servicename: bindingName }, { Accept: accept });
        const xml = String(response?.data ?? '');
        const parsed = PARSER.parse(xml);
        const group = parsed?.serviceGroup ?? parsed?.serviceList ?? {};
        const service = arr(group?.services)[0];
        if (!service) {
            return {
                service_root: null,
                service_root_note: `The ${category} resource returned no service entry for ${bindingName}.`,
            };
        }
        const url = String(service['@_serviceUrl'] ?? '');
        const collections = arr(service?.serviceInformation?.collection).map((c) => ({
            name: String(c?.['@_name'] ?? ''),
            is_root: c?.['@_isRoot'] === 'true',
        }));
        const published = group?.['@_published'] === 'true' || service['@_published'] === 'true';
        return {
            service_root: url || null,
            service_url_prefix: String(group?.['@_serviceUrlPrefix'] ?? '') || undefined,
            repository_id: String(service['@_repositoryId'] ?? '') || undefined,
            service_id: String(service['@_serviceId'] ?? '') || undefined,
            service_version: String(service['@_serviceVersion'] ?? '') || undefined,
            published,
            ...(collections.length ? { collections } : {}),
            ...(url
                ? {}
                : {
                    service_root_note: published
                        ? `SAP reported no service URL for ${bindingName}.`
                        : `${bindingName} is not published, so it has no service root yet. Publish it with PublishServiceBinding.`,
                }),
        };
    }
    catch (error) {
        const status = error?.response?.status;
        return {
            service_root: null,
            service_root_note: `The service root could not be resolved via /sap/bc/adt/businessservices/${category}` +
                `${status ? ` (HTTP ${status})` : ''}: ${error?.message ?? String(error)}. ` +
                'The binding document above is unaffected.',
        };
    }
}
async function handleGetServiceBinding(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.service_binding_name) {
            throw new Error('service_binding_name is required');
        }
        const serviceBindingName = args.service_binding_name.trim().toUpperCase();
        const responseFormat = args.response_format ?? 'xml';
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const state = await client.getServiceBinding().read({
            bindingName: serviceBindingName,
        });
        const response = state?.readResult;
        if (!response) {
            throw new Error(`Read did not return a response for service binding ${serviceBindingName}`);
        }
        const serviceRoot = await resolveServiceRoot(context, serviceBindingName, bindingODataVersion(String(response.data ?? '')));
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                service_binding_name: serviceBindingName,
                response_format: responseFormat,
                status: response.status,
                ...serviceRoot,
                payload: (0, serviceBindingPayloadUtils_1.parseServiceBindingPayload)(response.data, responseFormat),
            }, null, 2),
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
        });
    }
    catch (error) {
        logger?.error('Error reading service binding:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetServiceBinding.js.map