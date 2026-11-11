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
export interface DataPreviewColumn {
    name: string;
    type: string;
    description?: string;
    length?: number;
}
export interface DataPreviewMessage {
    text: string;
    severity: string;
}
export interface DataPreviewResult {
    execution_time?: number;
    /**
     * SAP's own `<dataPreview:totalRows>`. USUALLY 0 EVEN WHEN ROWS WERE
     * RETURNED — do not branch on it. Use returned_rows / has_more.
     */
    total_rows?: number;
    /** Number of rows in `rows`. Always equal to rows.length. */
    returned_rows: number;
    /** True when SAP indicated more rows exist beyond the ones returned. */
    has_more?: boolean;
    columns: DataPreviewColumn[];
    rows: Array<Record<string, string>>;
    /** Informational/warning messages SAP attached to the result. */
    messages?: DataPreviewMessage[];
    /** Problems detected in the response itself (see the invariants below). */
    warnings?: string[];
}
/**
 * Parse a Data Preview `tableData` document into rows.
 *
 * @param xmlData Raw response body.
 * @param maxRows The caller's row bound, when there was one. Rows beyond it are
 *   trimmed (SAP's ddic endpoint over-delivers by one) and `has_more` is set.
 */
export declare function parseDataPreviewXml(xmlData: string, maxRows?: number): DataPreviewResult;
/**
 * True when a failure is a session-class problem rather than a rejection of the
 * request. These are worth retrying once: they are transient, and SAP reports
 * them as 400, which the caller cannot tell apart from a bad query.
 */
export declare function isSessionError(error: any): boolean;
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
export declare function describeDataPreviewError(error: any, sql?: string): string;
//# sourceMappingURL=dataPreviewParser.d.ts.map