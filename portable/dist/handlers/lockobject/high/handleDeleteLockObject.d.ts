/**
 * DeleteLockObject Handler - Delete an ABAP lock object (ENQU). Workflow: lock -> DELETE.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteLockObject";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Delete. Subject: LockObject (ENQU). Delete an ABAP lock object from the SAP system.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_object_name: {
                readonly type: "string";
                readonly description: "Lock object name.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable objects; optional for $TMP.";
            };
        };
        readonly required: readonly ["lock_object_name"];
    };
};
interface DeleteLockObjectArgs {
    lock_object_name: string;
    transport_request?: string;
}
export declare function handleDeleteLockObject(context: HandlerContext, args: DeleteLockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteLockObject.d.ts.map