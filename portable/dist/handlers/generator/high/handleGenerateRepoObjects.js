"use strict";
/**
 * GenerateRepoObjects Handler — drive an SAP ADT repository generator.
 *
 * The repository generators under `/sap/bc/adt/repository/generators` create
 * whole bundles of ABAP artifacts from a single DB-table reference. Three
 * generator types are exposed:
 *
 *   - "uiservice"     — full RAP OData UI service  (CDS root + BDEF + behavior
 *                       pool + draft table + projection + service definition +
 *                       service binding + metadata extension)
 *   - "webapiservice" — same, but OData Web API variant (no UI specifics)
 *   - "smbc"          — Fiori-based maintenance object for a customizing table
 *
 * For all three the generator endpoint is reached with a POST carrying the
 * JSON `Content-Type` from the user spec; the response is an
 * `<adtcore:objectReferences>` XML body pointing at the created artifacts.
 * For uiservice / webapiservice we then follow up with a GET on the SRVB
 * reference and include its parsed payload alongside the list of generated
 * objects, so callers get a verified view of the binding's state.
 *
 * The /sap/bc/adt/repository/generators/<type>?referencedObject=… endpoint
 * has no wrapper in @mcp-abap-adt/adt-clients — this handler talks straight
 * to ADT, mirroring the handleReleaseTransport / handleSetTransportOwner
 * direct-REST pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.composeUiServiceBody = composeUiServiceBody;
exports.composeSmbcBody = composeSmbcBody;
exports.composeGeneratorBody = composeGeneratorBody;
exports.parseObjectReferences = parseObjectReferences;
exports.pickServiceBindingRef = pickServiceBindingRef;
exports.validateArgs = validateArgs;
exports.handleGenerateRepoObjects = handleGenerateRepoObjects;
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
// ---------- Generator types --------------------------------------------------
const TYPE_UISERVICE = 'uiservice';
const TYPE_WEBAPI = 'webapiservice';
const TYPE_SMBC = 'smbc';
const VALID_TYPES = [TYPE_UISERVICE, TYPE_WEBAPI, TYPE_SMBC];
const DEFAULT_BINDING_TYPE_UISERVICE = 'OData V4 - UI';
const DEFAULT_BINDING_TYPE_WEBAPI = 'OData V4';
// ---------- Endpoints & content types ---------------------------------------
const ENDPOINT_BY_TYPE = {
    uiservice: '/sap/bc/adt/businessservices/generators/uiservice',
    webapiservice: '/sap/bc/adt/businessservices/generators/webapiservice',
    smbc: '/sap/bc/adt/bct/generators/smbc',
};
const CT_REQUEST = 'application/vnd.sap.adt.repository.generator.content.v1+json';
const AT_RESPONSE = 'application/vnd.sap.adt.repository.generator.v1+json';
const AT_SRVB = 'application/vnd.sap.adt.businessservices.servicebinding.v1+xml, application/vnd.sap.adt.businessservices.servicebinding.v2+xml';
const BINDING_TYPE_UI_V4 = 'OData V4 - UI';
const BINDING_TYPE_WEBAPI_V4 = 'OData V4';
const BINDING_TYPE_UI_V2 = 'OData V2 - UI';
const BINDING_TYPE_WEBAPI_V2 = 'OData V2';
// ---------- TOOL_DEFINITION -------------------------------------------------
exports.TOOL_DEFINITION = {
    name: 'GenerateRepoObjects',
    available_in: ['onprem', 'cloud'],
    description: 'Generate a full repository bundle from one DB table using SAP ADT repository generators. Supported types: "uiservice" (OData V4 UI service via RAP — CDS root + BDEF + behavior pool + draft table + projection + service definition + service binding + metadata extension), "webapiservice" (parallel RAP Web API service — no UI specifics), "smbc" (Fiori-based maintenance object for a customizing table). For uiservice / webapiservice the created service binding is fetched and returned alongside the list of generated objects.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: [TYPE_UISERVICE, TYPE_WEBAPI, TYPE_SMBC],
                description: 'Which generator to invoke.',
            },
            // — common to all types —
            reference_object_name: {
                type: 'string',
                description: 'Name of the source DB table (e.g. "ZLEAVE_R2"). The referencedObject query parameter sent to SAP is built as /sap/bc/adt/ddic/tables/<name>.',
            },
            package: {
                type: 'string',
                description: 'Target ABAP package for the generated objects (e.g. "$TMP" or "ZLEAVE").',
            },
            master_language: {
                type: 'string',
                description: 'Master language for new objects (e.g. "EN").',
                default: 'EN',
            },
            description: {
                type: 'string',
                description: 'Description applied to the generated objects.',
            },
            transport_request: {
                type: 'string',
                description: 'Optional CTS transport request (forwarded as corrNr query parameter). Leave empty for $TMP / local packages.',
            },
            // — uiservice / webapiservice —
            cds_name: {
                type: 'string',
                description: 'Root CDS view name (e.g. "ZR_LEAVE_R23"). Required for uiservice / webapiservice.',
            },
            behavior_implementation_class: {
                type: 'string',
                description: 'Behavior implementation class (e.g. "ZBP_LEAVE_R23"). Required for uiservice / webapiservice.',
            },
            draft_table: {
                type: 'string',
                description: 'Draft table name for the root entity (uiservice only; ignored for webapiservice).',
            },
            service_projection_name: {
                type: 'string',
                description: 'Service projection name (e.g. "ZC_LEAVE_R23"). Required for uiservice / webapiservice.',
            },
            service_definition_name: {
                type: 'string',
                description: 'Service definition name (e.g. "ZUI_LEAVE_R2_O43"). Required for uiservice / webapiservice.',
            },
            service_binding_name: {
                type: 'string',
                description: 'Service binding name (e.g. "ZUI_LEAVE_R2_O43"). Required for uiservice / webapiservice.',
            },
            service_binding_type: {
                type: 'string',
                enum: [
                    BINDING_TYPE_UI_V4,
                    BINDING_TYPE_WEBAPI_V4,
                    BINDING_TYPE_UI_V2,
                    BINDING_TYPE_WEBAPI_V2,
                ],
                description: 'Binding type. Defaults to "OData V4 - UI" for uiservice and "OData V4" for webapiservice.',
            },
            // — smbc —
            maintenance_object_name: {
                type: 'string',
                description: 'Maintenance object name (e.g. "ZMO_LEAVE_R2"). Required for smbc.',
            },
            smbc_description: {
                type: 'string',
                description: 'Description specifically for the maintenance object (smbc only; falls back to the top-level `description`).',
            },
        },
        required: ['type', 'reference_object_name', 'package'],
    },
};
// ---------- Body composition -----------------------------------------------
/** Compose the JSON body for uiservice / webapiservice generators. */
function composeUiServiceBody(args, defaultBindingType) {
    const description = args.description ?? args.reference_object_name;
    return {
        metadata: {
            package: args.package,
            masterLanguage: args.master_language ?? 'EN',
            ...(args.transport_request
                ? { transportRequest: args.transport_request }
                : {}),
        },
        general: {
            referenceObjectName: args.reference_object_name,
            description,
        },
        businessObject: {
            dataModelEntity: { cdsName: args.cds_name },
            behavior: {
                implementationType: 'Managed',
                implementationClass: args.behavior_implementation_class,
                ...(args.draft_table ? { draftTable: args.draft_table } : {}),
            },
        },
        serviceProjection: { name: args.service_projection_name },
        businessService: {
            serviceDefinition: { name: args.service_definition_name },
            serviceBinding: {
                name: args.service_binding_name,
                bindingType: args.service_binding_type ?? defaultBindingType,
            },
        },
    };
}
/**
 * Compose the JSON body for the smbc (maintenance object) generator.
 *
 * NOTE: the exact body shape for the BCT maintenance-object generator is not
 * publicly documented; this is a best-guess shape that mirrors the BCT family
 * convention. If the live POST 4xxes, the integration test on DM2 will surface
 * SAP's real expected body — adjust this function to match.
 */
function composeSmbcBody(args) {
    const description = args.smbc_description ?? args.description ?? args.maintenance_object_name;
    return {
        package: args.package,
        masterLanguage: args.master_language ?? 'EN',
        ...(args.transport_request
            ? { transportRequest: args.transport_request }
            : {}),
        referenceObject: { name: args.reference_object_name },
        maintenanceObject: {
            name: args.maintenance_object_name,
            description,
        },
    };
}
/** Pick the right composer for the given type. */
function composeGeneratorBody(args) {
    if (args.type === TYPE_UISERVICE) {
        return composeUiServiceBody(args, DEFAULT_BINDING_TYPE_UISERVICE);
    }
    if (args.type === TYPE_WEBAPI) {
        return composeUiServiceBody(args, DEFAULT_BINDING_TYPE_WEBAPI);
    }
    return composeSmbcBody(args);
}
/**
 * Parse an `<adtcore:objectReferences>` response body into a normalized array.
 * `removeNSPrefix: true` collapses `adtcore:` prefixes — both `objectReferences`
 * and the per-attribute prefix fall back to plain attribute names.
 */
function parseObjectReferences(xmlText) {
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
    });
    const parsed = parser.parse(String(xmlText));
    const container = parsed?.objectReferences ?? {};
    const refs = (0, atcParser_1.asArray)(container?.objectReference);
    const references = refs.map((r) => {
        const meta = {};
        for (const k of Object.keys(r)) {
            if (k.startsWith('@_'))
                meta[k.slice(2)] = r[k];
        }
        return {
            uri: r['@_uri'] ?? null,
            type: r['@_type'] ?? null,
            name: r['@_name'] ?? null,
            meta,
        };
    });
    return { references, raw: parsed };
}
/** Find the SRVB reference (priority: name match → type contains SRVB → first). */
function pickServiceBindingRef(refs, expectedName) {
    if (!refs.length)
        return undefined;
    if (expectedName) {
        const byName = refs.find((r) => r.name?.toUpperCase() === expectedName.toUpperCase());
        if (byName)
            return byName;
    }
    const byType = refs.find((r) => (r.type ?? '').startsWith('SRVB/'));
    if (byType)
        return byType;
    return refs[0];
}
/**
 * Validate the incoming args; returns a list of errors (empty = OK).
 * Exported so unit tests can exercise per-type rules without the network.
 */
function validateArgs(args) {
    if (!args || typeof args !== 'object') {
        return 'args object is required';
    }
    const errors = [];
    if (!args.type || !VALID_TYPES.includes(args.type)) {
        errors.push({
            field: 'type',
            message: `must be one of: ${VALID_TYPES.join(', ')}`,
        });
    }
    if (!args.reference_object_name) {
        errors.push({ field: 'reference_object_name', message: 'is required' });
    }
    if (!args.package) {
        errors.push({ field: 'package', message: 'is required' });
    }
    if (args.type === TYPE_UISERVICE || args.type === TYPE_WEBAPI) {
        const rapFields = [
            ['cds_name', 'cds_name is required for uiservice / webapiservice'],
            [
                'behavior_implementation_class',
                'behavior_implementation_class is required for uiservice / webapiservice',
            ],
            [
                'service_projection_name',
                'service_projection_name is required for uiservice / webapiservice',
            ],
            [
                'service_definition_name',
                'service_definition_name is required for uiservice / webapiservice',
            ],
            [
                'service_binding_name',
                'service_binding_name is required for uiservice / webapiservice',
            ],
        ];
        for (const [k, msg] of rapFields) {
            if (!args[k])
                errors.push({ field: k, message: msg });
        }
    }
    else if (args.type === TYPE_SMBC) {
        if (!args.maintenance_object_name) {
            errors.push({
                field: 'maintenance_object_name',
                message: 'maintenance_object_name is required for smbc',
            });
        }
    }
    return errors;
}
// ---------- Handler ---------------------------------------------------------
async function handleGenerateRepoObjects(context, args) {
    const { connection, logger } = context;
    try {
        const errors = validateArgs(args);
        if (typeof errors === 'string') {
            return (0, utils_1.return_error)(new Error(errors));
        }
        if (errors.length) {
            return (0, utils_1.return_error)(new Error(`Invalid args: ${errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`));
        }
        const typed = args;
        const referencedObjectUri = `/sap/bc/adt/ddic/tables/${encodeURIComponent(typed.reference_object_name)}`;
        const body = composeGeneratorBody(typed);
        const url = `${ENDPOINT_BY_TYPE[typed.type]}?referencedObject=` +
            encodeURIComponent(referencedObjectUri);
        const params = {};
        if (typed.transport_request) {
            params.corrNr = typed.transport_request.trim();
        }
        logger?.info(`GenerateRepoObjects: type=${typed.type} table=${typed.reference_object_name} package=${typed.package}`);
        const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'POST', 'long', JSON.stringify(body), params, { 'Content-Type': CT_REQUEST, Accept: AT_RESPONSE });
        const responseBody = String(resp.data ?? '');
        const httpStatus = resp.status ?? 200;
        const { references, raw } = parseObjectReferences(responseBody);
        const result = {
            success: true,
            type: typed.type,
            http_status: httpStatus,
            generated_objects: references,
            message: `Generated ${references.length} object(s) via ${typed.type}`,
        };
        // Follow up with a GET on the created service binding for the two RAP
        // generator types — the generated binding is what callers usually want
        // to verify (bindingCreated, published state, services, etc.).
        if ((typed.type === TYPE_UISERVICE || typed.type === TYPE_WEBAPI) &&
            typed.service_binding_name) {
            const srvb = pickServiceBindingRef(references, typed.service_binding_name);
            if (srvb?.uri) {
                try {
                    const srvbResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, srvb.uri, 'GET', 'default', undefined, undefined, { Accept: AT_SRVB });
                    const srvbBody = String(srvbResp.data ?? '');
                    const { XMLParser } = require('fast-xml-parser');
                    const parser = new XMLParser({
                        ignoreAttributes: false,
                        attributeNamePrefix: '@_',
                        removeNSPrefix: true,
                    });
                    let srvbPayload = srvbBody;
                    try {
                        srvbPayload = parser.parse(srvbBody);
                    }
                    catch {
                        // leave as raw string
                    }
                    result.service_binding = {
                        uri: srvb.uri,
                        http_status: srvbResp.status ?? 200,
                        payload: srvbPayload,
                    };
                }
                catch (srvbError) {
                    logger?.warn?.(`GenerateRepoObjects: SRVB follow-up GET failed: ${srvbError?.message || srvbError}`);
                    result.service_binding_warning = `Follow-up GET on ${srvb.uri} failed: ${srvbError?.message || srvbError}`;
                }
            }
            else {
                result.service_binding_warning =
                    'No SRVB reference found in the generator response — service_binding payload omitted.';
            }
        }
        // Include the raw response body for debugging when no refs came back
        // (the SAP generator sometimes returns an error body in place of the
        // objectReferences list — surface that to the caller).
        if (references.length === 0) {
            result.raw_response_body = responseBody;
            // best-effort: if the body parses as an <exc:exception>, surface it
            const excMatch = responseBody.match(/<(?:\w+:)?message[^>]*>([\s\S]*?)<\/(?:\w+:)?message>/i);
            if (excMatch) {
                result.message = `Generator returned 0 references; SAP message: ${excMatch[1].trim()}`;
            }
        }
        // raw parse kept around in case callers want to inspect
        if (raw && references.length === 0)
            result.raw = raw;
        return (0, utils_1.return_response)({
            data: JSON.stringify(result, null, 2),
            status: httpStatus,
            statusText: resp.statusText ?? 'OK',
            headers: resp.headers ?? {},
            config: resp.config ?? {},
        });
    }
    catch (error) {
        logger?.error(`GenerateRepoObjects failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGenerateRepoObjects.js.map