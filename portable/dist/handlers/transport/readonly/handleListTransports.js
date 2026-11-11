"use strict";
/**
 * ListTransports — the user's transport requests.
 *
 * ROUND 2. This tool reported `{success:true, count:0, transports:[]}` while
 * `GetTransport <number>` — same session, same connection, same user — read a
 * request back as Modifiable and owned by that very user. `count: 0` with
 * `success: true` reads as a fact, so the natural agent workflow ("list, pick a
 * modifiable request, pass it as transport_request") concluded the user had no
 * open transport and then created a redundant one.
 *
 * MEASURED, so the fix is not a guess:
 *
 * - `GET /sap/bc/adt/cts/transportrequests` is reached correctly (the Accept
 *   `application/vnd.sap.adt.transportorganizertree.v1+xml` is the one the
 *   endpoint demands — anything else is a 406), and it answers **HTTP 200 with
 *   an empty self-closing `<tm:root adtcore:name="<user>"/>`**, 297 bytes.
 *   THIRTEEN parameter spellings were tried — user, targets, status, _action=FIND,
 *   trfunction/trstatus, requestType, targetSystem, no params at all — and every
 *   one returned the identical empty root. So the emptiness is SAP's answer, not
 *   a parsing or parameter mistake on our side.
 * - Ground truth from the same system: E070 holds **72** requests and tasks for
 *   that user, 35 of them modifiable top-level requests, including the one
 *   GetTransport reads back as modifiable.
 * - The organizer tree is driven by search configurations, and
 *   `/cts/transportrequests/searchconfiguration/configurations` is EMPTY on this
 *   system — the most likely reason the tree has nothing to select with.
 *
 * Two changes follow. (1) The ADT answer is parsed SHAPE-AGNOSTICALLY: every
 * `tm:request` anywhere in the document is collected. The old parser looked only
 * at `root['tm:request']` and `root['tm:workbench']['tm:request']`, so on a
 * system whose tree DOES return content — where requests sit under
 * workbench/customizing → modifiable/released → request — it would still have
 * reported zero. (2) When the tree comes back empty the handler does NOT report
 * "none exists": it reads E070/E07T through the Data Preview (the channel
 * GetTransaction already uses for TSTC/TSTCT) and says in `source` which of the
 * two answered.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.parseTransportListXml = parseTransportListXml;
exports.handleListTransports = handleListTransports;
const fast_xml_parser_1 = require("fast-xml-parser");
const clients_1 = require("../../../lib/clients");
const systemContext_1 = require("../../../lib/systemContext");
const utils_1 = require("../../../lib/utils");
const handleGetSqlQuery_1 = require("../../system/readonly/handleGetSqlQuery");
exports.TOOL_DEFINITION = {
    name: 'ListTransports',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] List transport requests owned by the current or a given user. Reads the ADT transport-organizer tree and, when that tree is empty, falls back to E070/E07T; `source` names which answered. count:0 means neither route found a request — not merely that the tree was empty.',
    notes: `Why the fallback exists, measured on S/4HANA 2023 FPS02. GET /sap/bc/adt/cts/transportrequests
answers HTTP 200 with an empty self-closing <tm:root/> of 297 bytes for every one of thirteen
parameter spellings tried — user, targets, status, _action=FIND, trfunction/trstatus, requestType,
targetSystem, and no parameters at all — while E070 on the same system holds 72 requests and tasks
for the same user, including one GetTransport reads back as Modifiable. The organizer tree is driven
by transport search configurations, and /cts/transportrequests/searchconfiguration/configurations is
empty on that system, which is the most likely cause. The endpoint accepts only
application/vnd.sap.adt.transportorganizertree.v1+xml; any other Accept is a 406.

The ADT answer is parsed shape-agnostically: every tm:request anywhere in the document counts. A
working organizer tree nests them under workbench/customizing and then modifiable/released, and the
two hard-coded paths used before would have reported zero for that shape too.

The fallback lists top-level REQUESTS only (E070-STRKORR empty); tasks belong to their request and
are read with GetTransport include_tasks. modifiable_only maps to TRSTATUS D or L. Descriptions come
from E07T and are best-effort — a missing text never fails the listing.`,
    inputSchema: {
        type: 'object',
        properties: {
            user: {
                type: 'string',
                description: 'SAP user name. Defaults to the connection user.',
            },
            modifiable_only: {
                type: 'boolean',
                description: 'Only not-yet-released requests (TRSTATUS D or L). Default: true.',
            },
            max_rows: {
                type: 'number',
                description: 'Row cap for the E070 fallback. Default 200.',
            },
        },
        required: [],
    },
};
/** E070-TRFUNCTION. Task functions are listed so a stray task is still labelled. */
const FUNCTION_TEXT = {
    K: 'Workbench request',
    W: 'Customizing request',
    T: 'Transport of copies',
    C: 'Relocation of objects',
    O: 'Relocation of a complete package',
    E: 'Relocation of objects without package change',
    S: 'Development/Correction (task)',
    R: 'Repair (task)',
    X: 'Unclassified task',
    Q: 'Customizing task',
};
/** E070-TRSTATUS. */
const STATUS_TEXT = {
    D: 'Modifiable',
    L: 'Modifiable, protected',
    O: 'Release started',
    R: 'Released',
    N: 'Released (import protection for repaired objects)',
};
/**
 * Collect every `tm:request` element anywhere in the parsed document.
 *
 * Deliberately shape-agnostic. The organizer tree nests requests under
 * workbench/customizing and then under modifiable/released, and the nesting
 * differs by release; the previous two hard-coded paths were the reason a
 * populated tree could still be reported as zero.
 */
function collectRequests(node, out = []) {
    if (!node || typeof node !== 'object')
        return out;
    if (Array.isArray(node)) {
        for (const item of node)
            collectRequests(item, out);
        return out;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'tm:request') {
            for (const request of Array.isArray(value) ? value : [value]) {
                if (request && typeof request === 'object')
                    out.push(request);
            }
            // Keep descending: a request may itself carry nested requests.
        }
        if (value && typeof value === 'object')
            collectRequests(value, out);
    }
    return out;
}
function parseTransportListXml(xmlData) {
    if (!xmlData || !xmlData.trim())
        return [];
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: true,
    });
    const parsed = parser.parse(xmlData);
    const requests = collectRequests(parsed);
    return requests
        .map((request) => {
        const status = String(request['tm:status'] ?? '');
        const type = String(request['tm:type'] ?? '');
        return {
            number: String(request['tm:number'] ?? request['adtcore:name'] ?? ''),
            description: String(request['tm:desc'] ?? request['tm:description'] ?? ''),
            type,
            type_text: FUNCTION_TEXT[type] || undefined,
            status,
            status_text: String(request['tm:status_text'] ?? '') ||
                STATUS_TEXT[status] ||
                undefined,
            owner: String(request['tm:owner'] ?? ''),
            target: String(request['tm:target'] ?? ''),
        };
    })
        .filter((entry) => entry.number);
}
/** Escape a value for an ABAP SQL string literal. */
function sqlLiteral(value) {
    return value.replace(/'/g, "''");
}
function pick(row, column) {
    if (!row)
        return '';
    const direct = row[column] ?? row[column.toLowerCase()];
    if (direct != null)
        return String(direct);
    const hit = Object.keys(row).find((key) => key.toUpperCase() === column.toUpperCase());
    return hit ? String(row[hit] ?? '') : '';
}
async function selectRows(client, sql, rowNumber, logger) {
    const response = await client
        .getUtils()
        .getSqlQuery({ sql_query: sql, row_number: rowNumber });
    if (response?.status !== 200 || !response?.data)
        return [];
    const data = typeof response.data === 'string' ? response.data : String(response.data);
    return (0, handleGetSqlQuery_1.parseSqlQueryXml)(data, sql, rowNumber, logger).rows;
}
/**
 * Read the user's top-level requests straight from the transport tables.
 *
 * STRKORR = '' keeps this to REQUESTS: a row with STRKORR filled is a task
 * inside one of them, and listing tasks beside their parents would double-count
 * what the caller then passes as `transport_request`.
 */
async function listFromE070(client, user, modifiableOnly, maxRows, logger) {
    const literal = sqlLiteral(user.toUpperCase());
    const statusFilter = modifiableOnly
        ? " AND ( trstatus = 'D' OR trstatus = 'L' )"
        : '';
    const rows = await selectRows(client, `SELECT trkorr, trfunction, trstatus, tarsystem, as4user, as4date FROM e070 ` +
        `WHERE as4user = '${literal}' AND strkorr = ''${statusFilter} ` +
        `ORDER BY trkorr DESCENDING`, maxRows, logger);
    const entries = rows.map((row) => {
        const type = pick(row, 'TRFUNCTION');
        const status = pick(row, 'TRSTATUS');
        return {
            number: pick(row, 'TRKORR'),
            type,
            type_text: FUNCTION_TEXT[type] || undefined,
            status,
            status_text: STATUS_TEXT[status] || undefined,
            owner: pick(row, 'AS4USER'),
            target: pick(row, 'TARSYSTEM'),
            date: pick(row, 'AS4DATE'),
        };
    });
    // Descriptions come from E07T. A missing text must not fail the listing, so
    // this is best-effort and each entry keeps whatever it already has.
    for (const entry of entries) {
        if (!entry.number)
            continue;
        try {
            const text = await selectRows(client, `SELECT as4text FROM e07t WHERE trkorr = '${sqlLiteral(entry.number)}'`, 1, logger);
            entry.description = pick(text[0], 'AS4TEXT');
        }
        catch (error) {
            logger?.debug?.(`E07T lookup failed for ${entry.number}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return entries;
}
async function handleListTransports(context, args) {
    const { connection, logger } = context;
    try {
        const modifiableOnly = args?.modifiable_only !== false;
        const maxRows = typeof args?.max_rows === 'number' && args.max_rows > 0
            ? args.max_rows
            : 200;
        const user = args?.user ||
            (0, systemContext_1.getSystemContext)().responsible ||
            process.env.SAP_USERNAME ||
            '';
        logger?.debug(`ListTransports: user=${user}, modifiable_only=${modifiableOnly}`);
        const client = (0, clients_1.createAdtClient)(connection, logger);
        let adtTransports = [];
        let adtError;
        try {
            const state = await client.getRequest().list({
                user,
                status: modifiableOnly ? 'D' : undefined,
            });
            adtTransports = parseTransportListXml(state.listResult?.data || '');
        }
        catch (error) {
            // The organizer tree failing is not the end of the call — the fallback can
            // still answer — but it must be reported, never swallowed into count:0.
            adtError = error instanceof Error ? error.message : String(error);
            logger?.warn(`ListTransports: ADT organizer tree failed: ${adtError}`);
        }
        if (adtTransports.length > 0) {
            logger?.info(`ListTransports: ${adtTransports.length} transport(s) from the ADT organizer tree`);
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            user,
                            modifiable_only: modifiableOnly,
                            source: 'adt_transport_organizer_tree',
                            count: adtTransports.length,
                            transports: adtTransports,
                        }, null, 2),
                    },
                ],
            };
        }
        // The tree said nothing. That is not evidence that the user has no request,
        // so ask the transport tables before answering.
        const warnings = [];
        if (adtError) {
            warnings.push(`The ADT transport-organizer tree could not be read (${adtError}); the list below comes from E070/E07T instead.`);
        }
        else {
            warnings.push('The ADT transport-organizer tree returned no requests for this user. That tree is driven by transport search configurations and answers empty on systems where none are defined, so it is not evidence that no request exists — E070/E07T was read instead.');
        }
        let fallback = [];
        try {
            fallback = await listFromE070(client, user, modifiableOnly, maxRows, logger);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger?.error(`ListTransports: E070 fallback failed: ${message}`);
            // Both routes failed. Reporting count:0 here would be exactly the defect
            // this handler was fixed for, so it is an error instead.
            return (0, utils_1.return_error)(new Error(`ListTransports could not determine the transports for ${user}: the ADT organizer tree returned none${adtError ? ` (${adtError})` : ''} and the E070 fallback failed (${message}). No conclusion about whether requests exist can be drawn from this.`));
        }
        logger?.info(`ListTransports: ${fallback.length} transport(s) from the E070 fallback`);
        if (fallback.length > 0) {
            warnings.push(`GetTransport <number> reads any of these back in full; the organizer tree does not list them on this system.`);
        }
        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        user,
                        modifiable_only: modifiableOnly,
                        source: 'e070_fallback',
                        adt_tree_returned: 0,
                        count: fallback.length,
                        transports: fallback,
                        warnings,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleListTransports.js.map