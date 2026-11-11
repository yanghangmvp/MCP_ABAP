/**
 * GetLocalTypes Handler - Read Local Types via AdtClient
 *
 * Uses AdtClient.getLocalTypes().read() for high-level read operation.
 * Local types are in the implementations include.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetLocalTypes";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Retrieve local types source code from a class (implementations include). Supports reading active or inactive version.";
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
interface GetLocalTypesArgs {
    class_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetLocalTypes(context: HandlerContext, args: GetLocalTypesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetLocalTypes.d.ts.map