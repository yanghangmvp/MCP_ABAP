/**
 * PrettyPrintSource Handler - format ABAP source with the system pretty printer.
 *
 * Mirrors abap-adt-api's prettyPrinter:
 *   POST /sap/bc/adt/abapsource/prettyprinter
 *   Content-Type: text/plain, Accept: text/plain
 *   body: the source to format -> formatted source (plain text)
 *
 * Formatting follows the system-wide pretty-printer settings (indentation +
 * keyword case). Read GetPrettyPrinterSettings to see them, SetPrettyPrinterSettings
 * to change them. Read-only: this only reformats the text you pass in; it does
 * not read or write any repository object.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "PrettyPrintSource";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Format ABAP source code using the system pretty printer (indentation + keyword case per the system settings). Pass the raw source; returns the formatted source. Useful to normalize generated code before Update*/activation. Does not modify any repository object.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly source: {
                readonly type: "string";
                readonly description: "ABAP source code to format.";
            };
        };
        readonly required: readonly ["source"];
    };
};
interface PrettyPrintArgs {
    source: string;
}
export declare function handlePrettyPrintSource(context: HandlerContext, args: PrettyPrintArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handlePrettyPrintSource.d.ts.map