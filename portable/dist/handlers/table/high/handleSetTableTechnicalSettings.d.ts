/**
 * SetTableTechnicalSettings — change a table's SE13 settings.
 *
 * Read-modify-write: only the fields the caller passes are changed, and the
 * response reports the state read back FROM SAP afterwards rather than echoing
 * the request. Omitting a field means keep it, never reset it — a table quietly
 * losing its data class or size category is the kind of change nobody notices
 * until something behaves oddly months later.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type BufferingMode } from '../../../lib/tableSettingsXml';
export declare const TOOL_DEFINITION: {
    readonly name: "SetTableTechnicalSettings";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name (e.g., ZMY_TABLE).";
            };
            readonly buffering: {
                readonly type: "string";
                readonly description: string;
                readonly enum: readonly ["not_allowed", "allowed_but_switched_off", "fully_buffered", "single_record", "generic"];
            };
            readonly generic_key_fields: {
                readonly type: "number";
                readonly description: string;
            };
            readonly size_category: {
                readonly type: "number";
                readonly description: "SE13 size category (0-4+): the expected space requirement of the table.";
            };
            readonly data_class: {
                readonly type: "string";
                readonly description: string;
            };
            readonly log_changes: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required when the table is in a transportable package.";
            };
        };
        readonly required: readonly ["table_name"];
    };
};
interface Args {
    table_name: string;
    buffering?: BufferingMode;
    generic_key_fields?: number;
    size_category?: number;
    data_class?: string;
    log_changes?: boolean;
    transport_request?: string;
}
export declare function handleSetTableTechnicalSettings(context: HandlerContext, args: Args): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleSetTableTechnicalSettings.d.ts.map