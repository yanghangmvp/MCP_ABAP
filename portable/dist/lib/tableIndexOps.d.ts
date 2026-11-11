/**
 * Operations shared by the table-index handlers.
 *
 * The awkward part of an index is not the payload, it is the ACTIVATION ORDER.
 * An index and its table are mutually dependent:
 *
 *   - activating the index alone fails: `Table ... is not active in ABAP Dictionary`
 *   - activating the table while the index has no fields fails:
 *     `[E] Index <TAB>-<ID> does not contain fields` — so a half-created index
 *     does not merely sit there, it BREAKS the table's activation
 *
 * Passing both object references in ONE activation call succeeds. Every write
 * here therefore activates the pair together, and a create that cannot be
 * completed removes the shell it made rather than leaving the table unactivatable.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
/** Write an index's JSON source (the field list) under a lock. */
export declare function writeTableIndexSource(connection: IAbapConnection, tableName: string, indexId: string, source: string, transportRequest?: string): Promise<void>;
export interface IndexActivationOutcome {
    success: boolean;
    activated: boolean;
    checked: boolean;
    messages: unknown[];
    errors: unknown[];
    description: string;
}
/**
 * Activate an index together with its table — the only order that works.
 *
 * Success is decided from the MESSAGES, not from the activated/checked flags:
 * SAP sets `activationExecuted="true"` even for objects it rejected, and this
 * endpoint was observed reporting `activated:true, checked:true` alongside
 * E-level messages saying the activation was cancelled.
 */
export declare function activateIndexWithTable(connection: IAbapConnection, tableName: string, indexId: string): Promise<IndexActivationOutcome>;
/**
 * Best-effort removal of an index shell.
 *
 * Used when a create cannot be finished. This is not tidiness: an index with no
 * fields makes its own table refuse to activate, so leaving the shell behind
 * would hand back a broken table.
 */
export declare function removeIndexShell(connection: IAbapConnection, tableName: string, indexId: string, transportRequest?: string): Promise<string | null>;
//# sourceMappingURL=tableIndexOps.d.ts.map