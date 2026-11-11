/**
 * UpdateLockObject Handler - Change an ABAP lock object's primary table / mode / RFC flag.
 * Workflow: GET current (preserve root attrs + package) -> lock -> PUT -> unlock -> (activate).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateLockObject";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Update. Subject: LockObject (ENQU). Update an existing lock object (primary table, lock mode, RFC flag). Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_object_name: {
                readonly type: "string";
                readonly description: "Lock object name (must exist).";
            };
            readonly primary_table: {
                readonly type: "string";
                readonly description: "Primary (base) table.";
            };
            readonly lock_mode: {
                readonly type: "string";
                readonly description: "Lock mode: E (default), S, X, O.";
                readonly enum: readonly ["E", "S", "X", "O"];
            };
            readonly allow_rfc: {
                readonly type: "boolean";
                readonly description: "Allow enqueue via RFC. Default: false.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if transportable).";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["lock_object_name", "primary_table"];
    };
};
interface UpdateLockObjectArgs {
    lock_object_name: string;
    primary_table: string;
    lock_mode?: string;
    allow_rfc?: boolean;
    transport_request?: string;
    activate?: boolean;
}
export declare function handleUpdateLockObject(context: HandlerContext, args: UpdateLockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateLockObject.d.ts.map