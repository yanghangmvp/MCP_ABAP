/**
 * CreateFunctionGroup Handler - ABAP Function Group Creation via ADT API
 *
 * Uses FunctionGroupBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> create -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateFunctionGroup";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Create a new ABAP function group in SAP system. Function groups serve as containers for function modules. Uses stateful session for proper lock management.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name (e.g., ZTEST_FG_001). Must follow SAP naming conventions (start with Z or Y, max 26 chars).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Function group description. If not provided, function_group_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LAB, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate function group after creation. Default: true. Set to false for batch operations.";
            };
        };
        readonly required: readonly ["function_group_name", "package_name"];
    };
};
interface CreateFunctionGroupArgs {
    function_group_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for CreateFunctionGroup MCP tool
 *
 * Uses FunctionGroupBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreateFunctionGroup(context: HandlerContext, args: CreateFunctionGroupArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateFunctionGroup.d.ts.map