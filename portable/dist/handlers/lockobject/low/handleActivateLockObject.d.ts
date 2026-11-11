/**
 * ActivateLockObject Handler - Activate an ABAP lock object (ENQU).
 * Activation generates the ENQUEUE_/DEQUEUE_ function modules.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateLockObject";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Activate an ABAP lock object (ENQU). Use after CreateLockObject or UpdateLockObject; activation generates the ENQUEUE/DEQUEUE function modules.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly lock_object_name: {
                readonly type: "string";
                readonly description: "Lock object name.";
            };
        };
        readonly required: readonly ["lock_object_name"];
    };
};
interface ActivateLockObjectArgs {
    lock_object_name: string;
}
export declare function handleActivateLockObject(context: HandlerContext, args: ActivateLockObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateLockObject.d.ts.map