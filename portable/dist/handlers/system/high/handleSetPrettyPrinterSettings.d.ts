/**
 * SetPrettyPrinterSettings Handler - change the system pretty-printer settings.
 *
 * Mirrors abap-adt-api's setPrettyPrinterSetting:
 *   PUT /sap/bc/adt/abapsource/prettyprinter/settings
 *   body: <prettyprintersettings:PrettyPrinterSettings ... indentation style/>
 *
 * Mutating: this changes a system-wide formatting setting that affects every
 * subsequent PrettyPrintSource call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
declare const STYLES: readonly ["toLower", "toUpper", "keywordUpper", "keywordLower", "keywordAuto", "none"];
export declare const TOOL_DEFINITION: {
    readonly name: "SetPrettyPrinterSettings";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Change the system ABAP pretty-printer settings (indentation on/off and keyword style). Note: this is a system-wide setting affecting every subsequent PrettyPrintSource call.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly indentation: {
                readonly type: "boolean";
                readonly description: "Enable indentation.";
            };
            readonly style: {
                readonly type: "string";
                readonly enum: readonly ["toLower", "toUpper", "keywordUpper", "keywordLower", "keywordAuto", "none"];
                readonly description: "Keyword style: toLower, toUpper, keywordUpper, keywordLower, keywordAuto, none.";
            };
        };
        readonly required: readonly ["indentation", "style"];
    };
};
interface SetPrettyPrinterSettingsArgs {
    indentation: boolean;
    style: (typeof STYLES)[number];
}
export declare function handleSetPrettyPrinterSettings(context: HandlerContext, args: SetPrettyPrinterSettingsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleSetPrettyPrinterSettings.d.ts.map