/**
 * UnlockClass Handler - Unlock ABAP Class
 *
 * Uses AdtClient.unlockClass from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UnlockClassLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Unlock an ABAP class after modification. Uses session from HandlerContext. Must use the same lock_handle from LockClass operation.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockClass operation.";
            };
        };
        readonly required: readonly ["class_name", "lock_handle"];
    };
};
interface UnlockClassArgs {
    class_name: string;
    lock_handle: string;
}
/**
 * Main handler for UnlockClass MCP tool
 *
 * Uses AdtClient.unlockClass - low-level single method call
 */
export declare function handleUnlockClass(context: HandlerContext, args: UnlockClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUnlockClass.d.ts.map