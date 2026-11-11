"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSapErrorPage = isSapErrorPage;
exports.parseSapErrorPage = parseSapErrorPage;
exports.describeSapErrorPage = describeSapErrorPage;
/** Cheap test: does this look like an SAP HTML error page rather than XML/JSON? */
function isSapErrorPage(body) {
    if (typeof body !== 'string')
        return false;
    const head = body.slice(0, 400).toLowerCase();
    return (head.includes('<!doctype html') ||
        head.includes('<html') ||
        body.includes('Application Server Error'));
}
function decodeEntities(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}
function toPlainText(html) {
    return decodeEntities(html
        // Drop the parts that are pure page furniture before stripping tags,
        // otherwise the excerpt is mostly CSS.
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}
/** Pull `<th>label</th> <td>value</td>` pairs out of the diagnostic table. */
function labelledRows(html) {
    const rows = {};
    const re = /<th[^>]*>([\s\S]*?)<\/th>\s*(?:<\/tr>\s*<tr[^>]*>\s*)?<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match = re.exec(html);
    while (match !== null) {
        const label = toPlainText(match[1]);
        const value = toPlainText(match[2]);
        if (label && value && label.length < 80)
            rows[label] = value;
        match = re.exec(html);
    }
    return rows;
}
function parseSapErrorPage(html, excerptChars = 400) {
    const details = labelledRows(html);
    const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    const plain = toPlainText(html);
    const pick = (...labels) => {
        for (const wanted of labels) {
            const key = Object.keys(details).find((k) => k.toLowerCase().includes(wanted));
            if (key)
                return details[key];
        }
        return undefined;
    };
    return {
        error_code: pick('error code'),
        message_text: heading ? toPlainText(heading[1]) : undefined,
        program: pick('abap program', 'program'),
        ...(Object.keys(details).length ? { details } : {}),
        excerpt: plain.length > excerptChars ? `${plain.slice(0, excerptChars)}…` : plain,
    };
}
/**
 * One-line message for a failure whose body turned out to be an SAP error page.
 * Returns undefined when the body is not such a page, so callers can fall
 * through to their existing handling.
 */
function describeSapErrorPage(error, subject) {
    const body = error?.response?.data;
    if (!isSapErrorPage(body))
        return undefined;
    const page = parseSapErrorPage(body);
    const status = error?.response?.status;
    const parts = [
        page.message_text,
        page.error_code ? `error code ${page.error_code}` : undefined,
        page.program ? `in program ${page.program}` : undefined,
    ].filter(Boolean);
    const summary = parts.length ? parts.join(' | ') : page.excerpt;
    return {
        message: `${subject} failed${status ? ` (HTTP ${status})` : ''}: ${summary}` +
            ' [SAP returned an HTML error page; the fields above were extracted from it]',
        details: page,
    };
}
//# sourceMappingURL=sapErrorPage.js.map