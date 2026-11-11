/**
 * UpdateFunctionModule Handler - Update Existing ABAP Function Module Source Code
 *
 * Uses FunctionModuleBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> lock -> update -> check -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateFunctionModule";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Update, Create. Subject: FunctionModule. Will be useful for updating or creating function module. Update source code of an existing ABAP function module. Locks, updates, unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name containing the function module (e.g., ZOK_FG_MCP01).";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name (e.g., Z_TEST_FM_MCP01). Function module must already exist.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete ABAP function module source code. Must include FUNCTION statement with parameters and ENDFUNCTION. Example:\n\nFUNCTION Z_TEST_FM\n  IMPORTING\n    VALUE(iv_input) TYPE string\n  EXPORTING\n    VALUE(ev_output) TYPE string.\n  \n  ev_output = iv_input.\nENDFUNCTION.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable function modules.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: FALSE — omitting it leaves the object INACTIVE, so pass true explicitly if you want it usable. (Update* tools are not consistent on this default: DDIC tools such as UpdateTable / UpdateStructure default to true.) The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["function_group_name", "function_module_name", "source_code"];
    };
};
interface UpdateFunctionModuleArgs {
    function_group_name: string;
    function_module_name: string;
    source_code: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateFunctionModule MCP tool
 *
 * Uses FunctionModuleBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleUpdateFunctionModule(context: HandlerContext, args: UpdateFunctionModuleArgs): Promise<any>;
export {};
//# sourceMappingURL=handleUpdateFunctionModule.d.ts.map