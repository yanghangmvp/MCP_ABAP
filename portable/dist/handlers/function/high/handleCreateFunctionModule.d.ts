/**
 * CreateFunctionModule Handler - ABAP Function Module Creation via ADT API
 *
 * Workflow: validate -> create (object in initial state)
 * Source code is set via UpdateFunctionModule handler.
 */
import { type FunctionModuleProcessingType } from '../../../lib/functionModuleCreate';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    name: string;
    available_in: readonly ["onprem", "cloud", "legacy"];
    description: string;
    inputSchema: {
        type: string;
        properties: {
            function_group_name: {
                type: string;
                description: string;
            };
            function_module_name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            processing_type: {
                type: string;
                description: string;
                enum: string[];
            };
            transport_request: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
interface CreateFunctionModuleArgs {
    function_group_name: string;
    function_module_name: string;
    description?: string;
    processing_type?: FunctionModuleProcessingType;
    transport_request?: string;
}
/**
 * Main handler for CreateFunctionModule MCP tool
 */
export declare function handleCreateFunctionModule(context: HandlerContext, args: CreateFunctionModuleArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateFunctionModule.d.ts.map