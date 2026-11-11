/**
 * GetProgram Handler - Read ABAP Program via AdtClient
 *
 * Uses AdtClient.getProgram().read() for high-level read operation.
 * Supports both active and inactive versions.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetProgram";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: "Retrieve ABAP program definition. Supports reading active or inactive version.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name (e.g., Z_MY_PROGRAM).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) for deployed version, \"inactive\" for modified but not activated version.";
                readonly default: "active";
            };
        };
        readonly required: readonly ["program_name"];
    };
};
interface GetProgramArgs {
    program_name: string;
    version?: 'active' | 'inactive';
}
/**
 * Main handler for GetProgram MCP tool
 *
 * Uses AdtClient.getProgram().read() - high-level read operation
 */
export declare function handleGetProgram(context: HandlerContext, args: GetProgramArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetProgram.d.ts.map