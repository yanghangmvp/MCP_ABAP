"use strict";
/**
 * WhereUsed handler using AdtClient utilities
 * Endpoint: /sap/bc/adt/repository/informationsystem/usageReferences
 * Uses getWhereUsedList for parsed results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetWhereUsed = handleGetWhereUsed;
const fast_xml_parser_1 = require("fast-xml-parser");
const getObjectsListCache_1 = require("../../../lib/getObjectsListCache");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetWhereUsed',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Search where-used references — find all objects that reference or depend on a given ABAP object. Answers: "where is X used", "who calls X", "what depends on X", "show usages of X". Returns referencing objects with types and packages. Covers classes, interfaces, programs, includes, function groups/modules, packages, tables, structures, TABLE TYPES, domains, data elements, CDS views, classic views, service definitions/bindings, behavior definitions, metadata extensions, message classes, lock objects and transformations. Types not in that list are rejected with the supported list; for the types SAP itself cannot answer for, the error comes from SAP.',
    inputSchema: {
        type: 'object',
        properties: {
            object_name: {
                type: 'string',
                description: "Name of the ABAP object. For function modules the name MUST be in the form 'GROUP|FM_NAME' (function group name, pipe, function module name).",
            },
            object_type: {
                type: 'string',
                description: "Type of the ABAP object. Case-insensitive; either a human alias or an ADT type code. 'class'/'clas/oc', 'interface'/'intf/if', 'program'/'prog/p', 'include', 'function'/'functiongroup'/'fugr', 'functionmodule'/'function_module'/'fugr/ff' (object_name must be 'GROUP|FM_NAME'), 'package'/'devc/k', 'table'/'tabl/dt', 'structure'/'stru/dt', 'table_type'/'tabletype'/'ttyp'/'ttyp/da', 'domain'/'doma/dd', 'data_element'/'dtel', 'view'/'cds_view'/'ddls/df' (CDS DDL source), 'classic_view'/'view/dv', 'service_definition'/'srvd', 'service_binding'/'srvb', 'behavior_definition'/'bdef', 'metadata_extension'/'ddlx', 'message_class'/'msag', 'lock_object'/'enqu', 'xslt'/'transformation'. An unknown value throws an error listing the supported types.",
            },
            enable_all_types: {
                type: 'boolean',
                description: "If true, expands the scope to all available object types (Eclipse 'select all' behavior) by flipping every isSelected flag in the scope XML. Default: false (SAP default scope). Note: on large systems this can make the search significantly slower.",
                default: false,
            },
        },
        required: ['object_name', 'object_type'],
    },
};
/**
 * Build the ADT main URI for the where-used target object.
 *
 * DDIC objects (table/structure/domain/dataelement/view/tabletype) expose
 * LOWERCASE ADT URIs; OO/program URIs are uppercase. Function modules take the
 * form GROUP|FM. Throws on unsupported types (matches the documented set).
 */
function buildWhereUsedUri(objectName, objectType) {
    const enc = (s) => encodeURIComponent(s);
    const upper = objectName.toUpperCase();
    const lower = objectName.toLowerCase();
    switch (objectType.toLowerCase()) {
        case 'class':
        case 'clas/oc':
            return `/sap/bc/adt/oo/classes/${enc(upper)}`;
        case 'interface':
        case 'intf/if':
            return `/sap/bc/adt/oo/interfaces/${enc(upper)}`;
        case 'program':
        case 'prog/p':
            return `/sap/bc/adt/programs/programs/${enc(upper)}`;
        case 'include':
            return `/sap/bc/adt/programs/includes/${enc(upper)}`;
        case 'function':
        case 'functiongroup':
        case 'fugr':
            return `/sap/bc/adt/functions/groups/${enc(upper)}`;
        case 'functionmodule':
        case 'function_module':
        case 'fugr/ff': {
            const [group, fm] = objectName.split('|');
            if (!group || !fm) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, "Function module name must be 'GROUP|FM_NAME'.");
            }
            return `/sap/bc/adt/functions/groups/${enc(group.toUpperCase())}/fmodules/${enc(fm.toUpperCase())}`;
        }
        case 'package':
        case 'devc/k':
            return `/sap/bc/adt/packages/${enc(upper)}`;
        case 'table':
        case 'tabl/dt':
            return `/sap/bc/adt/ddic/tables/${enc(lower)}`;
        case 'structure':
        case 'stru/dt':
            return `/sap/bc/adt/ddic/structures/${enc(lower)}`;
        // Table types: the type code a live system reports is TTYP/DA (verified by
        // reading STRING_TABLE), yet only 'tabletype' and 'ttyp/df' used to be
        // accepted — so the natural inputs ('table_type', 'ttyp', 'ttyp/da') were
        // all refused with "Unsupported object type".
        case 'tabletype':
        case 'table_type':
        case 'ttyp':
        case 'ttyp/da':
        case 'ttyp/df':
        case 'ttyp/tt':
            return `/sap/bc/adt/ddic/tabletypes/${enc(lower)}`;
        case 'domain':
        case 'doma':
        case 'doma/dd':
            return `/sap/bc/adt/ddic/domains/${enc(lower)}`;
        case 'dataelement':
        case 'data_element':
        case 'dtel':
        case 'dtel/de':
            return `/sap/bc/adt/ddic/dataelements/${enc(lower)}`;
        case 'view':
        case 'cds':
        case 'cds_view':
        case 'ddls':
        case 'ddls/df':
            return `/sap/bc/adt/ddic/ddl/sources/${enc(lower)}`;
        // Types below were previously refused client-side. Their ADT URIs are known,
        // so pass them through and let SAP answer (or refuse) — a real server
        // message beats a blanket "Unsupported object type".
        case 'classicview':
        case 'classic_view':
        case 'view/dv':
            return `/sap/bc/adt/ddic/views/${enc(lower)}`;
        case 'servicedefinition':
        case 'service_definition':
        case 'srvd':
        case 'srvd/srv':
            return `/sap/bc/adt/ddic/srvd/sources/${enc(lower)}`;
        case 'servicebinding':
        case 'service_binding':
        case 'srvb':
        case 'srvb/svb':
            return `/sap/bc/adt/businessservices/bindings/${enc(lower)}`;
        case 'behaviordefinition':
        case 'behavior_definition':
        case 'bdef':
        case 'bdef/bdo':
            return `/sap/bc/adt/bo/behaviordefinitions/${enc(lower)}`;
        case 'metadataextension':
        case 'metadata_extension':
        case 'ddlx':
        case 'ddlx/ex':
            return `/sap/bc/adt/ddic/ddlx/sources/${enc(lower)}`;
        case 'messageclass':
        case 'message_class':
        case 'msag':
        case 'msag/n':
            return `/sap/bc/adt/messageclass/${enc(lower)}`;
        case 'lockobject':
        case 'lock_object':
        case 'enqu':
        case 'enqu/dl':
            return `/sap/bc/adt/ddic/lockobjects/sources/${enc(lower)}`;
        case 'xslt':
        case 'transformation':
        case 'xslt/vt':
            return `/sap/bc/adt/xslt/transformations/${enc(lower)}`;
        default:
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Unsupported object type: ${objectType}. Supported: class, interface, program, ` +
                `include, function group, function module (name as 'GROUP|FM'), package, table, ` +
                `structure, table type, domain, data element, CDS view, classic view, service ` +
                `definition, service binding, behavior definition, metadata extension, message ` +
                `class, lock object, transformation. Either the human alias or the ADT type code ` +
                `is accepted (case-insensitive).`);
    }
}
const asArray = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
/**
 * Returns where-used references for ABAP objects using AdtClient utilities.
 * Uses getWhereUsedList for parsed structured results.
 */
async function handleGetWhereUsed(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.object_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Object name is required');
        }
        if (!args?.object_type) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Object type is required');
        }
        const typedArgs = args;
        logger?.info(`Resolving where-used list for ${typedArgs.object_type}/${typedArgs.object_name}`);
        // Single POST to the usageReferences endpoint (matches abap-adt-api).
        //
        // The previous implementation (adt-clients getWhereUsedList) did a
        // `/usageReferences/scope` PRE-FLIGHT POST first, which 404s on this S/4
        // system (SAP_BASIS 7.56) for EVERY object type — breaking where-used
        // entirely. Eclipse / abap-adt-api never call `/scope`: they POST the
        // request directly with an empty <affectedObjects/> and let SAP apply the
        // default scope. We mirror that.
        const objectUri = buildWhereUsedUri(typedArgs.object_name, typedArgs.object_type);
        const body = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">' +
            '<usagereferences:affectedObjects/>' +
            '</usagereferences:usageReferenceRequest>';
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/repository/informationsystem/usageReferences', 'POST', 'default', body, { uri: objectUri }, { 'Content-Type': 'application/*', Accept: 'application/*' });
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            removeNSPrefix: true,
        });
        const parsed = parser.parse(response.data);
        const root = parsed?.usageReferenceResult ?? {};
        const refObjs = asArray(root?.referencedObjects?.referencedObject);
        const references = refObjs.map((r) => {
            const adt = r?.adtObject ?? {};
            return {
                name: adt['@_name'] ?? r['@_objectIdentifier'] ?? '',
                type: adt['@_type'] ?? '',
                uri: r['@_uri'] ?? adt['@_uri'] ?? '',
                package_name: adt?.packageRef?.['@_name'] ?? '',
                usage_information: r['@_usageInformation'] ?? '',
            };
        });
        logger?.debug(`Where-used search completed for ${typedArgs.object_type}/${typedArgs.object_name}: ${references.length} references`);
        const formattedResponse = {
            object_name: typedArgs.object_name,
            object_type: typedArgs.object_type,
            enable_all_types: typedArgs.enable_all_types || false,
            total_references: references.length,
            references,
        };
        const mcpResult = {
            isError: false,
            content: [
                {
                    type: 'json',
                    json: formattedResponse,
                },
            ],
        };
        getObjectsListCache_1.objectsListCache.setCache(mcpResult);
        return mcpResult;
    }
    catch (error) {
        logger?.error('Failed to resolve where-used references', error);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `ADT error: ${String(error)}`,
                },
            ],
        };
    }
}
//# sourceMappingURL=handleGetWhereUsed.js.map