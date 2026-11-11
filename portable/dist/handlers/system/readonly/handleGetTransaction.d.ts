/**
 * GetTransaction — resolve an ABAP transaction code to what it actually starts.
 *
 * Previously this handler returned `{"message":"Not implemented"}`: the original
 * body was commented out because it called a `client.readTransaction()` that
 * does not exist, and there is no ADT resource that returns transaction
 * properties directly.
 *
 * The information does live in the Dictionary, so it is read the way SE93 reads
 * it — via the ADT Data Preview (freestyle SQL), the same channel GetSqlQuery
 * uses:
 *   - TSTC  — TCODE, PGMNA (program), DYPNO (screen), CINFO (type flags)
 *   - TSTCT — TTEXT (short text, language-dependent)
 * TSTCT is queried separately rather than joined so that a transaction with no
 * text in the session language still resolves.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTransaction";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve ABAP transaction (t-code) details: the program it starts (TSTC-PGMNA), the screen number (TSTC-DYPNO) and its short text (TSTCT-TTEXT). Reads the Dictionary through the ADT Data Preview, because ADT exposes no transaction resource of its own. Returns exists:false for an unknown t-code rather than failing.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transaction_name: {
                readonly type: "string";
                readonly description: "Transaction code (e.g., SE11, VA01). Case-insensitive.";
            };
        };
        readonly required: readonly ["transaction_name"];
    };
};
interface GetTransactionArgs {
    transaction_name: string;
}
export declare function handleGetTransaction(context: HandlerContext, args: GetTransactionArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetTransaction.d.ts.map