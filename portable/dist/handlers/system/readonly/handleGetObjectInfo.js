"use strict";
/**
 * GetObjectInfo — the repository object tree for a container object.
 *
 * ROUND 2 REWRITE. The previous implementation returned a success-shaped echo of
 * its own input (`{OBJECT_TYPE, OBJECT_NAME}` and nothing else) for EVERY input,
 * including its documented types, and byte-identically for a real object and for
 * a name that does not exist — so a caller had no value that meant "I could not
 * answer". Three stacked defects, all measured live on S/4HANA 2023 FPS02:
 *
 * 1. The root fetch passed `node_id='0000'`. `/repository/nodestructure` answers
 *    **HTTP 200 with an EMPTY BODY** for that node key. The proven path (the one
 *    getPackageContentsList uses) OMITS node_id on the root request. So every
 *    root call returned nothing at all, and the empty parse became an empty tree.
 *
 * 2. Even on a good response `TREE_CONTENT` is EMPTY at the root. The members
 *    are reached in TWO PHASES: the root answer carries `OBJECT_TYPES`
 *    (`SEU_ADT_OBJECT_TYPE_INFO`: OBJECT_TYPE + NODE_ID), and each of those
 *    NODE_IDs must be fetched AGAINST THE SAME PARENT to get its objects. The
 *    old code only ever read TREE_CONTENT, so the tree was unreachable by
 *    construction.
 *
 * 3. THE DANGEROUS ONE. For a NON-CONTAINER parent type the endpoint silently
 *    answers with THAT OBJECT'S PACKAGE TREE — byte-identical to the package's
 *    own response. Measured: `DTEL/DE ZMY_DATA_ELEMENT` === `DEVC/K ZMY_DDIC_PKG`
 *    (2181 bytes, same 8 type groups, same NODE_IDs), and `TABL/DS ZMY_STRUCTURE`
 *    === `DEVC/K ZMY_API_PKG`. Fixing 1 and 2 alone would therefore have made
 *    a data element report the 58 dictionary objects of its package as its own
 *    children: wrong data that looks right, which is worse than the empty echo.
 *
 * So this handler now (a) refuses a type that is not a measured container and
 * NAMES the supported list, the way GetWhereUsed does, (b) fetches both phases,
 * (c) distinguishes "does not exist" from "exists and has no members" — an empty
 * BODY means the endpoint could not resolve the object, a populated envelope
 * with zero members means genuinely empty — and (d) still cross-checks the
 * package-fallback signature at runtime, so an unmeasured type on another
 * release fails loudly instead of inventing children.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.parseNodeDoc = parseNodeDoc;
exports.groupSignature = groupSignature;
exports.isContainerType = isContainerType;
exports.handleGetObjectInfo = handleGetObjectInfo;
const fast_xml_parser_1 = require("fast-xml-parser");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const handleSearchObject_1 = require("../../search/readonly/handleSearchObject");
exports.TOOL_DEFINITION = {
    name: 'GetObjectInfo',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Object tree (members) of a CONTAINER object: package DEVC, class CLAS, interface INTF, program PROG, function group FUGR. Members carry type, description and ADT uri. Any other type is REFUSED naming the supported list. A name that cannot be resolved is an error, never an empty tree; an object that really has no members returns CHILDREN: [] with child_count 0.',
    notes: `Mechanism, measured live on S/4HANA 2023 FPS02. POST /sap/bc/adt/repository/nodestructure
is a TWO-PHASE protocol. The root request must OMIT node_id — passing node_id=0000 answers HTTP 200
with an EMPTY BODY, which is what made this tool return a success-shaped echo of its own input for
every object. The root answer carries OBJECT_TYPES/SEU_ADT_OBJECT_TYPE_INFO with one NODE_ID per
member type, and each NODE_ID is then fetched AGAINST THE SAME parent_type/parent_name to list that
type's objects. TREE_CONTENT is empty on the root request except for a package's subpackages.

Existence. The endpoint answers HTTP 200 with a ZERO-LENGTH body for a name it cannot resolve, and a
populated envelope for one it can. That is the only signal it gives, so it is what separates "does
not exist" from "exists and has no members": the first is an error, the second returns CHILDREN: []
with child_count 0.

Why other types are refused. For a NON-CONTAINER parent the endpoint silently answers with that
object's PACKAGE tree. Measured: DTEL/DE ZMY_DATA_ELEMENT and DEVC/K ZMY_DDIC_PKG return byte-identical
documents (same 8 type groups, same NODE_IDs), as do TABL/DS ZMY_STRUCTURE and DEVC/K ZMY_API_PKG. So
answering a data element would list its whole package as its members. Besides the type allow-list the
handler also compares a non-package result against the parent's own package tree at runtime, so a
container type not measured here fails loudly on another release instead of inventing children.

For a flat list of a package's contents prefer GetPackageContents; for one object's source outline
prefer GetObjectStructure.`,
    inputSchema: {
        type: 'object',
        properties: {
            parent_type: {
                type: 'string',
                description: 'DEVC/K, CLAS/OC, INTF/OI, PROG/P or FUGR/F.',
            },
            parent_name: {
                type: 'string',
                description: 'Object name (case-insensitive).',
            },
            maxDepth: {
                type: 'integer',
                description: 'Depth. 1 (default) = members; 2 also expands members that are containers.',
                default: 1,
            },
            enrich: {
                type: 'boolean',
                description: 'Add description/package for the ROOT node via SearchObject (default true). One extra call, not one per member.',
                default: true,
            },
        },
        required: ['parent_type', 'parent_name'],
    },
};
/**
 * Types whose node structure is a genuine tree of their own members, MEASURED
 * live — not inferred from a type registry. Everything else makes the endpoint
 * answer with the object's package (see defect 3 in the file header).
 */
const CONTAINER_PREFIXES = new Set(['DEVC', 'CLAS', 'INTF', 'PROG', 'FUGR']);
/** Total nodestructure requests one call may issue, so a deep tree cannot run away. */
const FETCH_BUDGET = 200;
const PARSER = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    ignoreDeclaration: true,
    // Every value stays a string: object names like '0100' (a screen) must not be
    // rewritten to a number.
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => name === 'SEU_ADT_REPOSITORY_OBJ_NODE' ||
        name === 'SEU_ADT_OBJECT_TYPE_INFO',
});
/** Read an element that may be absent, a string, or a `{'#text': ...}` object. */
function text(node, key) {
    const value = node?.[key];
    if (value === undefined || value === null)
        return '';
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'object') {
        const inner = value['#text'];
        if (inner !== undefined && inner !== null)
            return String(inner);
    }
    return '';
}
function parseNodeDoc(xmlData) {
    // A zero-length body is SAP's "I cannot resolve this object" — it is not an
    // empty tree, and it must never be reported as one.
    if (!xmlData || !xmlData.trim()) {
        return { unresolved: true, leaves: [], groups: [] };
    }
    const parsed = PARSER.parse(xmlData);
    const data = parsed?.['asx:abap']?.['asx:values']?.DATA;
    if (!data)
        return { unresolved: true, leaves: [], groups: [] };
    const rawLeaves = data?.TREE_CONTENT?.SEU_ADT_REPOSITORY_OBJ_NODE ?? [];
    const leaves = rawLeaves
        .map((node) => ({
        OBJECT_TYPE: text(node, 'OBJECT_TYPE'),
        OBJECT_NAME: text(node, 'OBJECT_NAME'),
        TECH_NAME: text(node, 'TECH_NAME'),
        OBJECT_URI: text(node, 'OBJECT_URI'),
        DESCRIPTION: text(node, 'DESCRIPTION'),
        EXPANDABLE: text(node, 'EXPANDABLE'),
    }))
        .filter((leaf) => leaf.OBJECT_NAME);
    const rawGroups = data?.OBJECT_TYPES?.SEU_ADT_OBJECT_TYPE_INFO ?? [];
    const groups = rawGroups
        .map((group) => ({
        objectType: text(group, 'OBJECT_TYPE'),
        label: text(group, 'OBJECT_TYPE_LABEL'),
        nodeId: text(group, 'NODE_ID'),
        category: text(group, 'CATEGORY_TAG'),
    }))
        .filter((group) => group.objectType && group.nodeId);
    return { unresolved: false, leaves, groups };
}
async function fetchNodeDoc(context, parentType, parentName, nodeId) {
    const { connection, logger } = context;
    const client = (0, clients_1.createAdtClient)(connection, logger);
    // node_id is passed ONLY for a phase-2 request. On the root request it must be
    // absent: '0000' makes SAP answer 200 with an empty body.
    const response = await client
        .getUtils()
        .fetchNodeStructure(parentType, parentName, nodeId, true);
    const body = typeof response?.data === 'string'
        ? response.data
        : response?.data
            ? String(response.data)
            : '';
    return parseNodeDoc(body);
}
/** The object-type NODE_ID signature of a document, used to spot a package fallback. */
function groupSignature(doc) {
    return doc.groups
        .map((group) => `${group.objectType}#${group.nodeId}`)
        .sort()
        .join('|');
}
async function lookupObject(context, objectType, objectName) {
    try {
        // SearchObject's parameter is `object_name`. The previous implementation
        // passed `query` and swallowed the resulting `-32602 object_name is
        // required` in a bare catch, so enrichment here had NEVER produced a
        // description or a package — which is why the echo this round replaces
        // carried neither. It also parsed the answer as `adtcore:objectReferences`
        // XML; SearchObject actually returns a TSV whose header is
        // `name\ttype\tdescription\tpackage`.
        // NOTE the search runs UNFILTERED first. Passing object_type makes
        // SearchObject return an EMPTY description (measured: `ZMY_CLASS CLAS/OC
        // <empty> ZMY_API_PKG` with the filter, `ZMY_CLASS CLAS/OC IFR:
        // Constants ZMY_API_PKG` without it), so filtering here would silently
        // cost the description. The type is matched on the rows instead, and the
        // filtered call is kept as a fallback for names the open search misses.
        const attempts = [
            { object_name: objectName, maxResults: 10 },
            { object_name: objectName, object_type: objectType, maxResults: 10 },
        ];
        const contents = [];
        for (const attempt of attempts) {
            const searchResult = await (0, handleSearchObject_1.handleSearchObject)(context, attempt);
            if (!searchResult.isError && Array.isArray(searchResult.content)) {
                contents.push(...searchResult.content);
            }
        }
        for (const entry of contents) {
            if (!('text' in entry) || typeof entry.text !== 'string')
                continue;
            const lines = entry.text.split('\n').filter((line) => line.trim());
            if (lines.length < 2)
                continue;
            const header = lines[0].split('\t').map((h) => h.trim().toLowerCase());
            const nameAt = header.indexOf('name');
            const typeAt = header.indexOf('type');
            const descAt = header.indexOf('description');
            const packageAt = header.indexOf('package');
            if (nameAt < 0)
                continue;
            for (const line of lines.slice(1)) {
                const cells = line.split('\t');
                if (String(cells[nameAt] ?? '')
                    .trim()
                    .toUpperCase() !== objectName.toUpperCase()) {
                    continue;
                }
                const type = typeAt >= 0 ? String(cells[typeAt] ?? '').trim() : '';
                if (type && type.toUpperCase() !== objectType.toUpperCase())
                    continue;
                const description = descAt >= 0 ? String(cells[descAt] ?? '').trim() : '';
                const packageName = packageAt >= 0 ? String(cells[packageAt] ?? '').trim() : '';
                return {
                    found: true,
                    ...(packageName ? { packageName } : {}),
                    ...(description ? { description } : {}),
                };
            }
        }
    }
    catch {
        // A failed lookup must not turn into a claim about the object; the caller
        // treats `found:false` as "could not confirm", never as "does not exist".
    }
    return { found: false };
}
/**
 * Does the object exist, independently of the node-structure endpoint?
 *
 * Needed because that endpoint returns the SAME empty body for a name that does
 * not exist and for a container that exists but has no members — and telling
 * those two apart is the whole point of the fix.
 *
 * For a package `/sap/bc/adt/packages/{name}` is an exact oracle: measured 200
 * for a populated package, 200 for an EMPTY one, 404 for a name that is not
 * there. Other types fall back to SearchObject.
 *
 * Returns `undefined` for "could not determine" — never guessed as `false`.
 */
async function objectExists(context, parentType, parentName) {
    if (parentType.split('/')[0] === 'DEVC') {
        try {
            const response = await (0, utils_1.makeAdtRequestWithTimeout)(context.connection, `/sap/bc/adt/packages/${encodeURIComponent(parentName.toLowerCase())}`, 'GET', 'default', undefined, undefined, { Accept: 'application/vnd.sap.adt.packages.v1+xml, application/xml' });
            return response?.status === 200;
        }
        catch (error) {
            if (error?.response?.status === 404)
                return false;
            return undefined;
        }
    }
    const lookup = await lookupObject(context, parentType, parentName);
    return lookup.found ? true : undefined;
}
/**
 * Members of one container: the root document's own leaves (a package's
 * subpackages arrive here) plus, per object-type group, the objects returned by
 * a phase-2 request for that group's NODE_ID.
 */
async function collectMembers(context, parentType, parentName, doc, budget) {
    const children = [];
    // A package's subpackages are returned TWICE: once in the root TREE_CONTENT
    // and again by the DEVC/K object-type group. (getPackageContentsList avoids
    // this by skipping the DEVC/K group outright; de-duplicating by identity is
    // the same fix without assuming which group is the redundant one.) Measured:
    // ZMY_PARENT_PKG reported 20 members for its 10 subpackages before this.
    const seen = new Set();
    const addChild = (child) => {
        const key = `${child.OBJECT_TYPE}::${child.OBJECT_NAME}`.toUpperCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        children.push(child);
        return true;
    };
    for (const leaf of doc.leaves) {
        addChild({
            OBJECT_TYPE: leaf.OBJECT_TYPE || '',
            OBJECT_NAME: leaf.OBJECT_NAME || '',
            ...(leaf.DESCRIPTION ? { OBJECT_DESCRIPTION: leaf.DESCRIPTION } : {}),
            ...(leaf.OBJECT_URI ? { OBJECT_URI: leaf.OBJECT_URI } : {}),
        });
    }
    const groups = [];
    for (const group of doc.groups) {
        if (budget.left <= 0)
            break;
        budget.left -= 1;
        let members = [];
        try {
            const groupDoc = await fetchNodeDoc(context, parentType, parentName, group.nodeId);
            members = groupDoc.leaves;
        }
        catch (error) {
            groups.push({
                object_type: group.objectType,
                label: group.label,
                node_id: group.nodeId,
                count: 0,
                error: error instanceof Error ? error.message : String(error),
            });
            continue;
        }
        let duplicates = 0;
        for (const member of members) {
            const added = addChild({
                OBJECT_TYPE: member.OBJECT_TYPE || group.objectType,
                OBJECT_NAME: member.OBJECT_NAME || '',
                ...(member.DESCRIPTION
                    ? { OBJECT_DESCRIPTION: member.DESCRIPTION }
                    : {}),
                ...(member.OBJECT_URI ? { OBJECT_URI: member.OBJECT_URI } : {}),
                MEMBER_OF_GROUP: group.objectType,
            });
            if (!added)
                duplicates += 1;
        }
        groups.push({
            object_type: group.objectType,
            label: group.label,
            node_id: group.nodeId,
            count: members.length,
            // Reported rather than dropped silently, so the difference between what
            // SAP returned for the group and what ended up in CHILDREN is visible.
            ...(duplicates ? { duplicates_of_earlier_nodes: duplicates } : {}),
        });
    }
    return { children, groups };
}
function isContainerType(objectType) {
    return CONTAINER_PREFIXES.has(objectType.split('/')[0].toUpperCase());
}
async function handleGetObjectInfo(context, args) {
    const { logger } = context;
    try {
        if (!args?.parent_type || !args?.parent_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'parent_type and parent_name are required');
        }
        const parentType = String(args.parent_type).trim().toUpperCase();
        const parentName = String(args.parent_name).trim().toUpperCase();
        // GUARD 1 — refuse a non-container type and NAME the supported list, rather
        // than letting the endpoint answer with the object's package tree.
        if (!isContainerType(parentType)) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `GetObjectInfo does not support object type ${parentType}. The ADT node-structure endpoint answers a non-container type with that object's PACKAGE tree, so a result here would list the package's objects as this object's members. Supported container types: DEVC/K (package), CLAS/OC (class), INTF/OI (interface), PROG/P (program), FUGR/F (function group). For one object's source outline use GetObjectStructure; for a package's contents use GetPackageContents.`);
        }
        const maxDepth = Number.isInteger(args.maxDepth) && args.maxDepth > 0
            ? args.maxDepth
            : 1;
        const enrich = typeof args.enrich === 'boolean' ? args.enrich : true;
        logger?.info(`GetObjectInfo: ${parentType}/${parentName} depth=${maxDepth}`);
        const budget = { left: FETCH_BUDGET };
        budget.left -= 1;
        const root = await fetchNodeDoc(context, parentType, parentName);
        // GUARD 2 — a zero-length body is "could not resolve", never an empty tree.
        // Say which of the two it is instead of returning something shaped like data.
        const emptyBodyWarnings = [];
        if (root.unresolved) {
            // The endpoint returns the SAME empty body for "no such object" and for a
            // container that exists with nothing in it (measured: the empty package
            // ZMY_EMPTY_PKG answers exactly like a name that was never created). So
            // ask an oracle that CAN tell them apart before saying anything.
            const exists = await objectExists(context, parentType, parentName);
            if (exists === false) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `${parentType} ${parentName} does not exist. POST /sap/bc/adt/repository/nodestructure returned an empty body and the object could not be found, so this is "no such object", not an empty tree.`);
            }
            if (exists === undefined) {
                throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `${parentType} ${parentName} could not be resolved: POST /sap/bc/adt/repository/nodestructure returned an empty body and its existence could not be confirmed independently. No conclusion about its contents can be drawn from this — check the name and the type code.`);
            }
            // It exists. An empty body is then its (empty) member list, and the fact
            // that the answer was empty rather than a populated envelope is reported
            // instead of being flattened into a plain zero.
            emptyBodyWarnings.push(`The node-structure endpoint returned an empty document for ${parentType} ${parentName}. The object exists, so it is reported as having no members — but SAP sent no envelope, which is the same response it gives for a name it cannot resolve.`);
        }
        // GUARD 3 — the package-fallback signature, checked at runtime so a
        // container type not measured here fails loudly on another release instead
        // of reporting a package's objects as the object's members.
        let packageName;
        let description;
        if (enrich || parentType.split('/')[0] !== 'DEVC') {
            const lookup = await lookupObject(context, parentType, parentName);
            packageName = lookup.packageName;
            description = lookup.description;
        }
        const fallbackCheckWarnings = [];
        if (parentType.split('/')[0] !== 'DEVC' && !packageName) {
            // The cross-check needs the object's package. Saying so beats letting the
            // guard quietly not run — a guard nobody knows was skipped is how a
            // silent wrong answer gets shipped.
            fallbackCheckWarnings.push(`The package of ${parentType} ${parentName} could not be determined, so the package-fallback cross-check was skipped. The type allow-list still applies.`);
        }
        if (parentType.split('/')[0] !== 'DEVC' && packageName) {
            budget.left -= 1;
            try {
                const packageDoc = await fetchNodeDoc(context, 'DEVC/K', packageName);
                if (!packageDoc.unresolved &&
                    groupSignature(packageDoc) === groupSignature(root) &&
                    root.groups.length > 0) {
                    throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `The node-structure endpoint answered ${parentType} ${parentName} with the object tree of its PACKAGE ${packageName} (identical object-type nodes), which means it does not expose a member tree for this type on this system. Refusing to report the package's objects as members of ${parentName}.`);
                }
            }
            catch (error) {
                if (error instanceof utils_1.McpError)
                    throw error;
                logger?.debug?.(`Package-fallback cross-check skipped for ${parentName}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const { children, groups } = await collectMembers(context, parentType, parentName, root, budget);
        // Depth 2+ expands only members that are themselves containers.
        if (maxDepth > 1) {
            for (const child of children) {
                if (budget.left <= 0)
                    break;
                if (!child.OBJECT_TYPE || !isContainerType(child.OBJECT_TYPE))
                    continue;
                try {
                    budget.left -= 1;
                    const childDoc = await fetchNodeDoc(context, child.OBJECT_TYPE, child.OBJECT_NAME);
                    if (childDoc.unresolved)
                        continue;
                    const nested = await collectMembers(context, child.OBJECT_TYPE, child.OBJECT_NAME, childDoc, budget);
                    child.CHILDREN = nested.children;
                    child.child_count = nested.children.length;
                }
                catch (error) {
                    logger?.debug?.(`Could not expand ${child.OBJECT_TYPE}/${child.OBJECT_NAME}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        const result = {
            success: true,
            OBJECT_TYPE: parentType,
            OBJECT_NAME: parentName,
            ...(description ? { OBJECT_DESCRIPTION: description } : {}),
            ...(packageName ? { OBJECT_PACKAGE: packageName } : {}),
            max_depth: maxDepth,
            // Always present, always an array. An object that really has no members
            // returns [] with child_count 0 — which is a different answer from the
            // errors above, and that difference is the point of this handler.
            child_count: children.length,
            CHILDREN: children,
            groups,
            source_endpoint: '/sap/bc/adt/repository/nodestructure',
            ...(() => {
                const warnings = [...emptyBodyWarnings, ...fallbackCheckWarnings];
                if (budget.left <= 0) {
                    warnings.push(`Stopped after ${FETCH_BUDGET} node-structure requests; the tree may be incomplete.`);
                }
                return warnings.length ? { warnings } : {};
            })(),
        };
        logger?.debug(`GetObjectInfo ${parentType}/${parentName}: ${children.length} member(s) in ${groups.length} group(s)`);
        return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        logger?.error(`Failed to build object info for ${args?.parent_type}/${args?.parent_name}`, error);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: error instanceof Error ? error.message : String(error),
                },
            ],
        };
    }
}
//# sourceMappingURL=handleGetObjectInfo.js.map