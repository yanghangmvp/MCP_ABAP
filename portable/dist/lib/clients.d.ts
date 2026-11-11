import { AdtClient } from '@mcp-abap-adt/adt-clients';
import type { IAbapConnection, ILogger } from '@mcp-abap-adt/interfaces';
/**
 * Say what a TIMEOUT means, which is not the same thing for a read and a write
 * (round 3 R3-F3).
 *
 * A reporting project hit three timeouts in one session and got the identical
 * message for two OPPOSITE outcomes:
 *
 *   * `UpdateMessage` x15 in parallel on one message class — 2 timed out and had
 *     NOT been applied. Re-sending them was the right move.
 *   * `RuntimeRunProgram` on a report that writes and activates 79 DDIC objects —
 *     timed out but had COMPLETED server-side. They only found out by querying
 *     DD04T afterwards; re-sending would have re-run the whole thing.
 *
 * Both said `timeout of 45000ms exceeded`. A timeout is a statement about OUR
 * patience, never about the server: the request was sent, and what happened to
 * it is unknown. So the message now says which of the two situations the caller
 * is in — for a read, nothing happened that matters; for a write, the work may
 * be done and must be VERIFIED before a retry — and names the knob that raises
 * the limit, because 45 s is short for DDIC mass activation.
 */
export declare function annotateTimeout(error: any, method: string): any;
/**
 * Give a bare write failure the one sentence the caller needs (field report round 6, F-3).
 *
 * The session retry above is GET-only on purpose, and the reporter agrees with
 * that: re-sending a create can leave a second object. The COST of that choice
 * is that a session-level failure on a write reaches the caller as
 *
 *     Error: Request failed with status code 400
 *
 * which is exactly the uninformative message the K-3 work existed to eliminate,
 * and it is intermittent — the reporter hit it once, built a theory about shell
 * classes, and their own probes killed the theory. Faced with that, a caller
 * rewrites source that was never wrong.
 *
 * So: no retry, but say what it might be. Only when the response carried NO
 * body — if SAP explained itself, that explanation is the answer and adding a
 * guess next to it would be noise.
 */
export declare function annotateBareWriteFailure(error: any, method: string): any;
export declare function createAdtClient(connection: IAbapConnection, logger?: ILogger): AdtClient;
export declare function getAdtClient(): AdtClient;
export declare function resetClientCache(): void;
//# sourceMappingURL=clients.d.ts.map