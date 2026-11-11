export interface ScanInput {
    query: string;
    query2?: string;
    exclude?: string[];
    exclude_comments?: boolean;
    max_hits: number;
}
export interface ScanHit {
    line: number;
    snippet: string;
}
export interface ScanResult {
    hits: ScanHit[];
    capped: boolean;
}
export declare function scanLines(lines: readonly string[], input: ScanInput): ScanResult;
//# sourceMappingURL=lineScanner.d.ts.map