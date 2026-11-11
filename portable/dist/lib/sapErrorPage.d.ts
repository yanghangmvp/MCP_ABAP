/**
 * Reducing an SAP "Application Server Error" HTML page to the sentence it is
 * hiding.
 *
 * WHY THIS EXISTS (field report round 3, K-5). Nine of 72 `RuntimeRunProgram`
 * calls failed with the complete `<!DOCTYPE html>… Application Server Error …`
 * document forwarded unparsed — up to 10.8 KB of markup and inline CSS per
 * failure. The message id and text a caller needs are inside that page; they
 * were never extracted, so the caller paid ~2,700 tokens to be told nothing.
 *
 * The page SAP's ICF error handler emits carries the useful values in a small
 * table of `<th>label</th><td>value</td>` rows, wrapped in a lot of styling:
 *
 *     <h1>The following error text was processed in the system DM2 : ...</h1>
 *     ...
 *     <th>Error code</th><td>ICF-IE-http-c:310-l:E-T:...</td>
 *     <th>Termination occurred in the ABAP program</th><td>SAPMHTTP</td>
 *
 * This does not attempt to be a general HTML parser. It strips tags, collapses
 * whitespace and pulls out the handful of labelled values, then hands back both
 * the extracted fields and a short plain-text excerpt — so a caller gets the
 * reason without the stylesheet, and nothing is silently dropped: the full page
 * is still available when explicitly asked for.
 */
export interface SapErrorPage {
    /** SAP error code (`ICF-IE-http-...`), when the page names one. */
    error_code?: string;
    /** The human sentence, e.g. the `<h1>` error text. */
    message_text?: string;
    /** ABAP program the termination happened in. */
    program?: string;
    /** Whatever labelled rows were found, verbatim. */
    details?: Record<string, string>;
    /** Plain-text excerpt of the page, whitespace collapsed. */
    excerpt: string;
}
/** Cheap test: does this look like an SAP HTML error page rather than XML/JSON? */
export declare function isSapErrorPage(body: unknown): body is string;
export declare function parseSapErrorPage(html: string, excerptChars?: number): SapErrorPage;
/**
 * One-line message for a failure whose body turned out to be an SAP error page.
 * Returns undefined when the body is not such a page, so callers can fall
 * through to their existing handling.
 */
export declare function describeSapErrorPage(error: any, subject: string): {
    message: string;
    details: SapErrorPage;
} | undefined;
//# sourceMappingURL=sapErrorPage.d.ts.map