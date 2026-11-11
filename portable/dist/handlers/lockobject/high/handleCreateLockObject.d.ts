/**
 * CreateLockObject Handler - Create an ABAP lock object (ENQU).
 *
 * ADT collection: POST /sap/bc/adt/ddic/lockobjects/sources (confirmed via
 * discovery on S/4 7.56). No adt-clients wrapper. The primary table + lock mode
 * are sent in the create body; SAP generates the ENQUEUE_/DEQUEUE_ function
 * modules on activation (ActivateLockObject). Lock object names conventionally
 * start with E and are limited like DB objects (<=16 chars).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateLockObject";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: LockObject (ENQU). Create a new ABAP lock object over a primary table. Activate with ActivateLockObject to generate the ENQUEUE/DEQUEUE function modules.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_object_name: {
                readonly type: "string";
                readonly description: "Lock object name (e.g., EZMY_LOCK). Conventionally starts with E, max 16 chars.";
            };
            readonly primary_table: {
                readonly type: "string";
                readonly description: "Primary (base) table the lock protects.";
            };
            readonly lock_mode: {
                readonly type: "string";
                readonly description: "Lock mode for the primary table: E (exclusive, default), S (shared), X (exclusive non-cumulative), O (optimistic).";
                readonly enum: readonly ["E", "S", "X", "O"];
            };
            readonly allow_rfc: {
                readonly type: "boolean";
                readonly description: "Allow enqueue via RFC. Default: false.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description (defaults to name).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., $TMP, ZMY_PKG).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request (if transportable).";
            };
        };
        readonly required: readonly ["lock_object_name", "primary_table", "package_name"];
    };
};
interface CreateLockObjectArgs {
    lock_object_name: string;
    primary_table: string;
    lock_mode?: string;
    allow_rfc?: boolean;
    description?: string;
    package_name: string;
    transport_request?: string;
}
export declare function handleCreateLockObject(context: HandlerContext, args: CreateLockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateLockObject.d.ts.map