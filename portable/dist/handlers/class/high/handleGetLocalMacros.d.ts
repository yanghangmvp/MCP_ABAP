/**
 * GetLocalMacros Handler - Read Local Macros via AdtClient
 *
 * Uses AdtClient.getLocalMacros().read() for high-level read operation.
 * Note: Macros are supported in older ABAP versions but not in newer ones.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetLocalMacros";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve local macros source code from a class (macros include). Supports reading active or inactive version. Note: Macros are supported in older ABAP versions but not in newer ones.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Parent class name (e.g., ZCL_MY_CLASS).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface GetLocalMacrosArgs {
    class_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetLocalMacros(context: HandlerContext, args: GetLocalMacrosArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetLocalMacros.d.ts.map