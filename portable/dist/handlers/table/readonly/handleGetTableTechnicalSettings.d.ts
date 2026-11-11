/**
 * GetTableTechnicalSettings — read a table's SE13 settings (buffering, size
 * category, data class, logging).
 *
 * There was previously no way to see this through the MCP: the settings object
 * is not part of the table's own payload, and DD09L's SPEICHKLA column is not
 * exposed by the ADT Data Preview. The response therefore also reports the
 * DD09L-PUFFERUNG value the state corresponds to, so the caller can cross-check
 * it with `SELECT tabname, pufferung FROM dd09l` (that read does work).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTableTechnicalSettings";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZMY_TABLE).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface Args {
    table_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetTableTechnicalSettings(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetTableTechnicalSettings.d.ts.map