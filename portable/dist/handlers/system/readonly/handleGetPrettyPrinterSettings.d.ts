/**
 * GetPrettyPrinterSettings Handler - read the system pretty-printer settings.
 *
 * Mirrors abap-adt-api's prettyPrinterSetting:
 *   GET /sap/bc/adt/abapsource/prettyprinter/settings
 *   -> <abapformatter:PrettyPrinterSettings abapformatter:indentation="true"
 *        abapformatter:style="keywordUpper"/>
 *
 * These are the settings PrettyPrintSource applies. Read-only.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetPrettyPrinterSettings";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Read the system ABAP pretty-printer settings (indentation on/off and keyword style, e.g. keywordUpper). These are the settings PrettyPrintSource applies.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly required: readonly [];
    };
};
export declare function handleGetPrettyPrinterSettings(context: HandlerContext, _args: Record<string, never>): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleGetPrettyPrinterSettings.d.ts.map