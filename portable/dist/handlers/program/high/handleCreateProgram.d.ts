/**
 * CreateProgram Handler - ABAP Program Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * Source code is set via UpdateProgram handler.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateProgram";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "Operation: Create. Subject: Program. Will be useful for creating program. Create a new ABAP program (report) in SAP system. Creates the program object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., Z_TEST_PROGRAM_001). Must follow SAP naming conventions (start with Z or Y).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Program description. If not provided, program_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LAB, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly program_type: {
                readonly type: "string";
                readonly description: "Program type: 'executable' (Report), 'include', 'module_pool', 'function_group', 'class_pool', 'interface_pool'. Default: 'executable'";
                readonly enum: readonly ["executable", "include", "module_pool", "function_group", "class_pool", "interface_pool"];
            };
            readonly application: {
                readonly type: "string";
                readonly description: "Application area (e.g., 'S' for System, 'M' for Materials Management). Default: '*'";
            };
        };
        readonly required: readonly ["program_name", "package_name"];
    };
};
export declare function handleCreateProgram(context: HandlerContext, params: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleCreateProgram.d.ts.map