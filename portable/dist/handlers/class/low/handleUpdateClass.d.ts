/**
 * UpdateClass Handler - Update ABAP Class Source Code
 *
 * Uses AdtClient.updateClass from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateClassLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Update source code of an existing ABAP class. Uses session from HandlerContext. Requires lock handle from LockClass operation. - use UpdateClass (high-level) for full workflow with lock/unlock/activate.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_TEST_CLASS_001). Class must already exist.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete ABAP class source code including CLASS DEFINITION and IMPLEMENTATION sections.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Lock handle from LockClass operation. Required for update operation.";
            };
        };
        readonly required: readonly ["class_name", "source_code", "lock_handle"];
    };
};
interface UpdateClassArgs {
    class_name: string;
    source_code: string;
    lock_handle: string;
}
/**
 * Main handler for UpdateClass MCP tool
 *
 * Uses AdtClient.updateClass - low-level single method call
 */
export declare function handleUpdateClass(context: HandlerContext, args: UpdateClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateClass.d.ts.map