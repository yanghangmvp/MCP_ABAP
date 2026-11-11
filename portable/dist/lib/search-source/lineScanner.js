"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanLines = scanLines;
const SNIPPET_MAX = 255;
function isCommentLine(line) {
    if (line.length === 0)
        return false;
    if (line[0] === '*')
        return true;
    const idx = line.search(/\S/);
    return idx !== -1 && line[idx] === '"';
}
function lineMatches(raw, needle1, needle2, excludes, skipComments) {
    if (skipComments && isCommentLine(raw))
        return false;
    const lower = raw.toLowerCase();
    if (lower.indexOf(needle1) === -1)
        return false;
    if (needle2 !== undefined && lower.indexOf(needle2) === -1)
        return false;
    if (excludes && excludes.some((e) => lower.indexOf(e) !== -1))
        return false;
    return true;
}
function scanLines(lines, input) {
    const hits = [];
    let capped = false;
    if (!input.query)
        return { hits, capped };
    const needle1 = input.query.toLowerCase();
    const needle2 = input.query2 ? input.query2.toLowerCase() : undefined;
    const excludes = input.exclude && input.exclude.length > 0
        ? input.exclude.map((e) => e.toLowerCase())
        : undefined;
    const skipComments = input.exclude_comments === true;
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!lineMatches(raw, needle1, needle2, excludes, skipComments))
            continue;
        if (hits.length >= input.max_hits) {
            capped = true;
            break;
        }
        hits.push({
            line: i + 1,
            snippet: raw.length > SNIPPET_MAX ? raw.slice(0, SNIPPET_MAX) : raw,
        });
    }
    return { hits, capped };
}
//# sourceMappingURL=lineScanner.js.map