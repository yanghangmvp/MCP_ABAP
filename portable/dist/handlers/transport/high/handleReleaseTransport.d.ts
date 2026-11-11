/**
 * ReleaseTransport Handler - release a transport request (and its tasks).
 *
 * Mirrors abap-adt-api's transportRelease:
 *   POST /sap/bc/adt/cts/transportrequests/{tr}/{action}
 *     action = newreleasejobs (default)
 *            | relwithignlock  (ignore_locks)
 *            | relObjigchkatc  (ignore_atc)
 *   -> tm:root/tm:releasereports/chkrun:checkReport[] with status + messages
 *
 * Mutating: releasing is irreversible; the request can no longer be changed.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReleaseTransport";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Release a transport request (irreversible — the request can no longer be changed afterwards). Optionally ignore locks or ATC objections. Returns the release report(s) with status and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_number: {
                readonly type: "string";
                readonly description: "Transport request number, e.g. ABCK900001.";
            };
            readonly ignore_locks: {
                readonly type: "boolean";
                readonly description: "Release even if objects are locked. Default: false.";
            };
            readonly ignore_atc: {
                readonly type: "boolean";
                readonly description: "Release ignoring ATC objections. Default: false.";
            };
        };
        readonly required: readonly ["transport_number"];
    };
};
interface ReleaseTransportArgs {
    transport_number: string;
    ignore_locks?: boolean;
    ignore_atc?: boolean;
}
export declare function handleReleaseTransport(context: HandlerContext, args: ReleaseTransportArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleReleaseTransport.d.ts.map