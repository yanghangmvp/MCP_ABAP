"use strict";
/**
 * GetInactiveObjects Handler - Retrieve list of inactive ABAP objects
 *
 * Reads `/sap/bc/adt/activation/inactiveobjects` in-repo rather than through the
 * dep, for two reasons: the dep's wrapper drops `adtcore:uri` (the one field that
 * makes an entry directly usable with ActivateObjects), and the endpoint returns
 * the WHOLE system's worklist with no server-side filter, so the filtering has
 * to happen here.
 *
 * NOTE ON PACKAGE FILTERING: the payload carries only uri/type/name — there is
 * no package. So filtering by package is not possible from this response, and
 * `name_prefix` is the way to ask "any of mine" (which is the question that
 * matters on a shared development system).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.parseInactiveObjects = parseInactiveObjects;
exports.handleGetInactiveObjects = handleGetInactiveObjects;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetInactiveObjects',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Get a list of inactive ABAP objects — modified but not yet activated, pending ' +
        'activation. Shows classes, tables, CDS views, and other objects awaiting activation. ' +
        'The endpoint returns the WHOLE system’s worklist, so on a shared development system use ' +
        'name_prefix to ask "any of mine". total_count always reports the unfiltered total, so a ' +
        'filter can never make the system look cleaner than it is. ' +
        'Each entry includes its ADT uri, which can be passed straight to ActivateObjects.',
    inputSchema: {
        type: 'object',
        properties: {
            name_prefix: {
                type: 'string',
                description: 'Keep only objects whose name starts with this prefix (case-insensitive), e.g. "ZMY". ' +
                    'This is the practical way to find your own inactive objects — the response carries ' +
                    'no package information, so filtering by package is not possible here.',
            },
            object_type: {
                type: 'string',
                description: 'Keep only objects of this ADT type. Accepts the full code ("CLAS/OC") or the ' +
                    'leading part ("CLAS", "DDLS", "PROG", "BDEF", "SRVD").',
            },
        },
        required: [],
    },
};
/** Parse `adtcore:objectReferences` into flat entries. */
function parseInactiveObjects(xml) {
    const refs = (xml ?? '').match(/<adtcore:objectReference\b[^>]*\/?>/g) ?? [];
    return refs
        .map((ref) => ({
        name: /adtcore:name="([^"]*)"/.exec(ref)?.[1] ?? '',
        type: /adtcore:type="([^"]*)"/.exec(ref)?.[1] ?? '',
        uri: /adtcore:uri="([^"]*)"/.exec(ref)?.[1] ?? '',
    }))
        .filter((o) => o.name);
}
async function handleGetInactiveObjects(context, params) {
    const { connection, logger } = context;
    try {
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        logger?.info('Retrieving inactive objects...');
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/activation/inactiveobjects', 'GET');
        const all = parseInactiveObjects(String(response?.data ?? ''));
        const prefix = params?.name_prefix?.trim().toUpperCase();
        const typeFilter = params?.object_type?.trim().toUpperCase();
        const objects = all.filter((o) => {
            if (prefix && !o.name.toUpperCase().startsWith(prefix))
                return false;
            if (typeFilter) {
                const type = o.type.toUpperCase();
                // Accept both "CLAS" and the full "CLAS/OC".
                if (type !== typeFilter && !type.startsWith(`${typeFilter}/`)) {
                    return false;
                }
            }
            return true;
        });
        const filtered = prefix !== undefined || typeFilter !== undefined;
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                // The unfiltered total is always reported: a filter must not be able
                // to make the system look cleaner than it is.
                total_count: all.length,
                count: objects.length,
                ...(filtered
                    ? {
                        filters: {
                            ...(prefix ? { name_prefix: prefix } : {}),
                            ...(typeFilter ? { object_type: typeFilter } : {}),
                        },
                        filtered_out_count: all.length - objects.length,
                    }
                    : {}),
                objects,
                ...(all.length > 0 && objects.length === 0
                    ? {
                        note: `No inactive object matches the filter, but the system has ${all.length} ` +
                            'inactive object(s) overall. Drop the filter to see them.',
                    }
                    : {}),
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error('Error retrieving inactive objects:', error);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetInactiveObjects.js.map