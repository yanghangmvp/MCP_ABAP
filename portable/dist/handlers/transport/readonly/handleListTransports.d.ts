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
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ListTransports";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] List transport requests owned by the current or a given user. Reads the ADT transport-organizer tree and, when that tree is empty, falls back to E070/E07T; `source` names which answered. count:0 means neither route found a request — not merely that the tree was empty.";
    readonly notes: "Why the fallback exists, measured on S/4HANA 2023 FPS02. GET /sap/bc/adt/cts/transportrequests\nanswers HTTP 200 with an empty self-closing <tm:root/> of 297 bytes for every one of thirteen\nparameter spellings tried — user, targets, status, _action=FIND, trfunction/trstatus, requestType,\ntargetSystem, and no parameters at all — while E070 on the same system holds 72 requests and tasks\nfor the same user, including one GetTransport reads back as Modifiable. The organizer tree is driven\nby transport search configurations, and /cts/transportrequests/searchconfiguration/configurations is\nempty on that system, which is the most likely cause. The endpoint accepts only\napplication/vnd.sap.adt.transportorganizertree.v1+xml; any other Accept is a 406.\n\nThe ADT answer is parsed shape-agnostically: every tm:request anywhere in the document counts. A\nworking organizer tree nests them under workbench/customizing and then modifiable/released, and the\ntwo hard-coded paths used before would have reported zero for that shape too.\n\nThe fallback lists top-level REQUESTS only (E070-STRKORR empty); tasks belong to their request and\nare read with GetTransport include_tasks. modifiable_only maps to TRSTATUS D or L. Descriptions come\nfrom E07T and are best-effort — a missing text never fails the listing.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly user: {
                readonly type: "string";
                readonly description: "SAP user name. Defaults to the connection user.";
            };
            readonly modifiable_only: {
                readonly type: "boolean";
                readonly description: "Only not-yet-released requests (TRSTATUS D or L). Default: true.";
            };
            readonly max_rows: {
                readonly type: "number";
                readonly description: "Row cap for the E070 fallback. Default 200.";
            };
        };
        readonly required: readonly [];
    };
};
interface ListTransportsArgs {
    user?: string;
    modifiable_only?: boolean;
    max_rows?: number;
}
interface TransportEntry {
    number: string;
    description?: string;
    type?: string;
    type_text?: string;
    status?: string;
    status_text?: string;
    owner?: string;
    target?: string;
    date?: string;
}
export declare function parseTransportListXml(xmlData: string): TransportEntry[];
export declare function handleListTransports(context: HandlerContext, args: ListTransportsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleListTransports.d.ts.map