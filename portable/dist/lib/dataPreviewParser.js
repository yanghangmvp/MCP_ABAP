"use strict";
/**
 * ADT Data Preview (/sap/bc/adt/datapreview/**) response parsing.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The previous parser lived inline in handleGetSqlQuery and extracted cells with
 *
 *     /<dataPreview:data[^>]*>(.*?)<\/dataPreview:data>/g
 *
 * which requires a CLOSING tag. SAP emits a blank cell as the SELF-CLOSING
 * `<dataPreview:data/>`, so that regex does not match blank cells at all. Two
 * distinct corruptions followed, both measured live on DM2/310 (2026-08-23):
 *
 *  1. ROWS VANISHED. `SELECT allow_msgno_query FROM zmy_table` on a table with
 *     one row whose value is blank returned `rows: []`. The caller cannot tell
 *     "no such row" from "the row exists and the value is blank" — different
 *     facts that lead to opposite decisions.
 *
 *  2. VALUES SHIFTED UP BETWEEN ROWS — the worse one, because it is silent and
 *     looks like plausible data. Skipping blank cells makes the per-column array
 *     shorter than the row count, and every value after a blank moves to a lower
 *     row. Measured: `SELECT objct, fiel3, fiel4 FROM tobj` (25 rows) yields a
 *     FIEL3 dataSet of 10 blanks followed by `PLANT_GR`; the old parser reported
 *     `PLANT_GR` as row 1's value. Anyone verifying authorization objects with
 *     that read would see fields attributed to the wrong object.
 *
 * A third defect was independent of the blanks: cells were emitted with
 * `columnValues[i] || null`, so the legitimate values '' and '0' became null.
 *
 * So this parser is deliberately positional and uses a real XML parser:
 *   - cell index == row index, always;
 *   - a blank cell is '' (a value), never null (which means "no such column");
 *   - values stay strings, so SAP's leading zeros ('0001') survive;
 *   - returned_rows === rows.length by construction.
 *
 * On the counts SAP itself gives us, measured rather than assumed:
 *   - `<dataPreview:totalRows>` is 0 in every response observed on this system,
 *     including responses carrying rows. It is only populated when a count was
 *     requested, so it must never be used to decide "no data". It is passed
 *     through for back-compatibility and flagged in `warnings` when it
 *     contradicts the rows actually returned.
 *   - the /datapreview/ddic endpoint (GetTableContents) returns rowNumber + 1
 *     rows — max_rows: 10 came back with 11. The extra row is SAP's
 *     "there is more" probe, so it is trimmed here and reported as `has_more`.
 *     /datapreview/freestyle (GetSqlQuery) honours rowNumber exactly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDataPreviewXml = parseDataPreviewXml;
exports.isSessionError = isSessionError;
exports.describeDataPreviewError = describeDataPreviewError;
const fast_xml_parser_1 = require("fast-xml-parser");
const PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    ignoreDeclaration: true,
    // Keep every cell a string: SAP sends '0001', '000010', 'X'. Numeric coercion
    // would rewrite those, which is the same class of silent corruption this file
    // exists to remove.
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    // A single-column result and a single-cell column must still be arrays, or the
    // positional logic below would have to special-case them.
    isArray: (name) => name === 'dataPreview:columns' || name === 'dataPreview:data',
};
function asArray(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
/** Cells of one `<dataPreview:columns>` section, in document (== row) order. */
function cellsOf(section) {
    const dataSet = section?.['dataPreview:dataSet'];
    if (!dataSet)
        return [];
    // With isArray on 'dataPreview:data' every cell is an entry, including the
    // self-closing ones (they parse to ''), so index === row index.
    return asArray(dataSet['dataPreview:data']).map((cell) => cell === undefined || cell === null ? '' : String(cell));
}
/**
 * Parse a Data Preview `tableData` document into rows.
 *
 * @param xmlData Raw response body.
 * @param maxRows The caller's row bound, when there was one. Rows beyond it are
 *   trimmed (SAP's ddic endpoint over-delivers by one) and `has_more` is set.
 */
function parseDataPreviewXml(xmlData, maxRows) {
    const parser = new fast_xml_parser_1.XMLParser(PARSER_OPTIONS);
    const parsed = parser.parse(xmlData ?? '');
    const table = parsed?.['dataPreview:tableData'] ?? {};
    const rawTotal = table['dataPreview:totalRows'];
    const totalRows = rawTotal === undefined || rawTotal === null
        ? undefined
        : Number.parseInt(String(rawTotal), 10);
    const rawTime = table['dataPreview:queryExecutionTime'];
    const executionTime = rawTime === undefined || rawTime === null
        ? undefined
        : Number.parseFloat(String(rawTime));
    const messages = asArray(table['dataPreview:message'])
        .map((m) => ({
        text: String(m?.['@_dataPreview:text'] ?? ''),
        severity: String(m?.['@_dataPreview:severity'] ?? ''),
    }))
        .filter((m) => m.text);
    const sections = asArray(table['dataPreview:columns']);
    const columns = [];
    const cellsPerColumn = [];
    for (const section of sections) {
        // Read the metadata from the SECTION that owns it rather than pairing two
        // independent lists by index, so a missing metadata element can never
        // attribute one column's data to another column's name.
        const meta = section?.['dataPreview:metadata'] ?? {};
        const name = String(meta['@_dataPreview:name'] ?? '');
        if (!name)
            continue;
        const rawLength = meta['@_dataPreview:length'];
        const length = rawLength === undefined ? undefined : Number.parseInt(rawLength, 10);
        columns.push({
            name,
            type: String(meta['@_dataPreview:type'] ?? 'UNKNOWN'),
            description: String(meta['@_dataPreview:description'] ?? ''),
            ...(length !== undefined && Number.isFinite(length) ? { length } : {}),
        });
        cellsPerColumn.push(cellsOf(section));
    }
    const warnings = [];
    // INVARIANT: every column must carry the same number of cells. If SAP ever
    // returns a ragged result, that is exactly the situation where rows get
    // misaligned, so say so instead of quietly padding.
    const cellCounts = [...new Set(cellsPerColumn.map((c) => c.length))];
    if (cellCounts.length > 1) {
        warnings.push(`Columns returned different cell counts (${cellsPerColumn
            .map((c, i) => `${columns[i]?.name}=${c.length}`)
            .join(', ')}). Rows are aligned by position and short columns are ` +
            'padded with an empty value — treat this result as unreliable.');
    }
    const rowCount = cellCounts.length ? Math.max(...cellCounts) : 0;
    const allRows = [];
    for (let r = 0; r < rowCount; r++) {
        const row = {};
        columns.forEach((column, c) => {
            // '' means "the cell is blank"; a column is never dropped from a row.
            row[column.name] = cellsPerColumn[c][r] ?? '';
        });
        allRows.push(row);
    }
    // SAP's ddic endpoint answers rowNumber+1 so the client can tell there is
    // more. Honour the caller's bound and report the fact separately.
    let rows = allRows;
    let hasMore;
    if (typeof maxRows === 'number' && maxRows > 0 && allRows.length > maxRows) {
        rows = allRows.slice(0, maxRows);
        hasMore = true;
    }
    if (totalRows !== undefined &&
        Number.isFinite(totalRows) &&
        totalRows < rows.length) {
        warnings.push(`total_rows (${totalRows}) is lower than the number of rows returned ` +
            `(${rows.length}). SAP only populates <totalRows> when a count was ` +
            'requested, so it is not a row count and must not be used to decide ' +
            '"no data" — use returned_rows.');
    }
    return {
        ...(executionTime !== undefined && Number.isFinite(executionTime)
            ? { execution_time: executionTime }
            : {}),
        ...(totalRows !== undefined && Number.isFinite(totalRows)
            ? { total_rows: totalRows }
            : {}),
        returned_rows: rows.length,
        ...(hasMore ? { has_more: hasMore } : {}),
        columns,
        rows,
        ...(messages.length ? { messages } : {}),
        ...(warnings.length ? { warnings } : {}),
    };
}
/**
 * True when a failure is a session-class problem rather than a rejection of the
 * request. These are worth retrying once: they are transient, and SAP reports
 * them as 400, which the caller cannot tell apart from a bad query.
 */
function isSessionError(error) {
    const status = error?.response?.status;
    const raw = error?.response?.data;
    const body = typeof raw === 'string' ? raw : '';
    const text = `${error?.message ?? ''} ${body}`;
    if (status === 401 || status === 403)
        return false;
    return /session\s*timed\s*out|session timeout|ExceptionSessionTimeout|CSRF token|session has been terminated/i.test(text);
}
/**
 * Turn a failed Data Preview request into a message that says what SAP actually
 * objected to.
 *
 * The handlers used to report `ADT error: AxiosError: Request failed with status
 * code 400`, which is indistinguishable from "your SQL is wrong" — so an agent
 * seeing a session timeout rewrites a perfectly good query. SAP's body carries
 * the real reason (`Unknown column name "SPEICHKLA".`, `Session Timed Out`); it
 * was simply being discarded.
 */
function describeDataPreviewError(error, sql) {
    const status = error?.response?.status;
    const raw = error?.response?.data;
    const body = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : '';
    // <message lang="EN">Unknown column name "X".</message>
    const messages = [...body.matchAll(/<message[^>]*>([\s\S]*?)<\/message>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
    const typeId = /<type\s+id="([^"]+)"/.exec(body)?.[1];
    const parts = [];
    parts.push(status ? `ADT ${status}` : 'ADT error');
    if (typeId)
        parts.push(typeId);
    if (messages.length)
        parts.push(messages[0]);
    else if (error?.message)
        parts.push(String(error.message));
    let text = parts.join(': ');
    if (isSessionError(error)) {
        text +=
            ' | This is a SESSION-level failure, not a rejected query: the request ' +
                'was retried automatically and still failed. The SQL is probably fine.';
    }
    else if (/unknown column name/i.test(body)) {
        text +=
            ' | Check the name against the DDIC field list (SAP uses e.g. OBJCT, not ' +
                'OBJECT), and note that Data Preview does not expose every column of ' +
                'every table.';
    }
    else if (status === 400 && /\bjoin\b/i.test(sql ?? '')) {
        text +=
            ' | ADT Data Preview rejects JOINs. Query each table separately and ' +
                'combine the results.';
    }
    return text;
}
//# sourceMappingURL=dataPreviewParser.js.map