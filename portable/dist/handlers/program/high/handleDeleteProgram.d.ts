/**
 * DeleteProgram Handler - Delete ABAP Program via AdtClient
 *
 * Uses AdtClient.getProgram().delete() for high-level delete operation.
 * Includes deletion check before actual deletion.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeleteProgram";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "Delete an ABAP program from the SAP system. Includes deletion check before actual deletion. Transport request optional for $TMP objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., Z_MY_PROGRAM).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable objects. Optional for local objects ($TMP).";
            };
        };
        readonly required: readonly ["program_name"];
    };
};
interface DeleteProgramArgs {
    program_name: string;
    transport_request?: string;
}
/**
 * Main handler for DeleteProgram MCP tool
 *
 * Uses AdtClient.getProgram().delete() - high-level delete operation with deletion check
 */
export declare function handleDeleteProgram(context: HandlerContext, args: DeleteProgramArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeleteProgram.d.ts.map