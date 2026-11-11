/**
 * LockClass Handler - Lock ABAP Class
 *
 * Uses AdtClient.lockClass from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "LockClassLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Lock an ABAP class for modification. Uses session from HandlerContext. Returns lock handle that must be used in subsequent update/unlock operations.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface LockClassArgs {
    class_name: string;
}
/**
 * Main handler for LockClass MCP tool
 *
 * Uses AdtClient.lockClass - low-level single method call
 */
export declare function handleLockClass(context: HandlerContext, args: LockClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleLockClass.d.ts.map