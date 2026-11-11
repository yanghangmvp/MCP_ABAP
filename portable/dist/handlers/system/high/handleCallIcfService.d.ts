/**
 * CallIcfService — one authenticated HTTP call against the connected SAP system.
 *
 * See src/lib/icfCall.ts for why this exists and how its scope was decided.
 * It is registered in the HIGH group only: even a GET here is not `readonly` in
 * the sense the readonly group promises, because the path allow-list covers
 * OData services whose GETs can have side effects (function imports, actions).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CallIcfService";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly path: {
                readonly type: "string";
                readonly description: string;
            };
            readonly method: {
                readonly type: "string";
                readonly enum: readonly ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];
                readonly description: "HTTP method. Default GET.";
            };
            readonly body: {
                readonly type: "string";
                readonly description: string;
            };
            readonly query: {
                readonly type: "object";
                readonly description: "Query parameters as a flat object. sap-client is supplied by the connection.";
                readonly additionalProperties: true;
            };
            readonly headers: {
                readonly type: "object";
                readonly description: string;
                readonly additionalProperties: {
                    readonly type: "string";
                };
            };
        };
        readonly required: readonly ["path"];
    };
    readonly notes: "OData V4 service roots: the segment after the binding name is the REPOSITORY, and it is not the same\nfor every binding — a UI service binding resolves to /srvd/ while an A2X / Web-API binding resolves\nto /srvd_a2x/. The example above shows srvd_a2x; copying it for a UI binding answers\n403 \"Service '<SRVD>' repository 'SRVD_A2X' is not assigned to group '<binding>'\", which names\nneither the cause nor the fix. Do not guess the shape: GetServiceBinding returns the resolved\nservice_root and repository_id straight from SAP.\n\n/sap/bc/adt/* is deliberately unreachable: ADT is covered by the typed tools in\nthis server, and a generic passthrough would be an unaudited second route to the\nsame API. The deny check runs BEFORE the allow-list, so it cannot be reached via\na /sap/bc/ prefix match, and the path is percent-decoded to a fixed point before\nany check — ICF resolves encoded dot segments, so %2e%2e and %252e%252e are\nrefused along with a literal \"..\". Ordinary encoding survives: the ORIGINAL\nstring is what gets sent, so an OData key predicate like Set('A%20B') still\nreaches the service.\n\nCredentials cannot go in or come out. authorization, cookie, x-csrf-token and\nproxy-authorization are refused as ARGUMENTS — an error, not a silent override,\nso no credential lands in the conversation or the log. On the way back\nset-cookie, authorization, x-csrf-token, www-authenticate and proxy-authenticate\ncome back as [redacted] with the KEY kept, so a reader can still see that a\ncookie was set. Only the method and path are logged.\n\nAn HTTP error is a RESULT, not a tool failure: a 404 or 500 from the service\nunder test is what you are trying to observe, so it comes back as success:false\nwith the status and body rather than an exception that swallows them.";
};
interface CallIcfServiceArgs {
    path: string;
    method?: string;
    body?: string;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
}
export declare function handleCallIcfService(context: HandlerContext, args: CallIcfServiceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCallIcfService.d.ts.map