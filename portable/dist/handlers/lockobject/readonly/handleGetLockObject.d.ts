/**
 * GetLockObject Handler - Read an ABAP lock object (ENQU).
 * ADT: GET /sap/bc/adt/ddic/lockobjects/sources/{name}. No adt-clients wrapper.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetLockObject";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Read. Subject: LockObject (ENQU). Retrieve an ABAP lock object: primary table, lock mode, RFC flag, generated ENQUEUE/DEQUEUE modules.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_object_name: {
                readonly type: "string";
                readonly description: "Lock object name (e.g., EZMY_LOCK).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["lock_object_name"];
    };
};
interface GetLockObjectArgs {
    lock_object_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetLockObject(context: HandlerContext, args: GetLockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetLockObject.d.ts.map