import type { HandlerContext } from '../handlers/interfaces';
import { type PackageContentsFetcher, type ScanObjectType } from './packageEnumerator';
import { type ReadFailure, type ReadSourceUnitsDeps, type SourceVersion } from './sourceReader';
export interface OrchestratorInput {
    query: string;
    query2?: string;
    exclude?: string[];
    packages: string[];
    include_subpackages?: boolean;
    object_filter?: string;
    object_types?: readonly ScanObjectType[];
    exclude_comments?: boolean;
    max_hits_per_object?: number;
    emit_no_hits?: boolean;
    max_objects?: number;
    concurrency?: number;
    version?: SourceVersion;
    /** Internal scan deadline in ms. When exceeded, returns hits gathered so far with truncated.by_timeout=true. */
    time_budget_ms?: number;
    /** Read a class's CCDEF/CCIMP/CCAU/CCMAC includes as well (default true). */
    class_includes?: boolean;
    /** Return the compact hit shape {object, include, line, text}. */
    hits_only?: boolean;
    /** Cap the serialized size of `results`; sets truncated.by_max_bytes. */
    max_bytes?: number;
}
export interface SearchHit {
    devclass: string;
    object_type: ScanObjectType;
    object_name: string;
    include: string;
    line: number;
    snippet: string;
}
/** Compact hit shape used when hits_only is set. */
export interface CompactHit {
    object: string;
    include: string;
    line: number;
    text: string;
}
export interface NoHitEntry {
    devclass: string;
    object_type: ScanObjectType;
    object_name: string;
}
export interface OrchestratorResult {
    results: SearchHit[] | CompactHit[];
    no_hits?: NoHitEntry[];
    scanned: {
        packages: number;
        objects: number;
        /** Source units actually read (a class contributes up to 5). */
        sources: number;
        /**
         * Total lines actually scanned. This is the honest coverage number: "0 hits
         * over 32 lines" for a 951-line class is a scan that read almost nothing,
         * and without this the two are indistinguishable (I-23).
         */
        source_lines: number;
        /** Source units that could not be read; see read_failures. */
        read_failures: number;
    };
    /**
     * Units the scan could not read. A failed read yields no hits, which is
     * byte-identical to "no match", so it is reported rather than swallowed.
     */
    read_failures?: ReadFailure[];
    /** Hits dropped by max_bytes. */
    results_omitted?: number;
    truncated: {
        by_object_cap: boolean;
        by_max_objects: boolean;
        /** True when a time_budget_ms deadline was exceeded; results contain hits gathered before the cutoff. */
        by_timeout: boolean;
        /** True when max_bytes cut the result list. */
        by_max_bytes: boolean;
    };
}
export interface OrchestratorDeps {
    fetchPackageContents: PackageContentsFetcher;
    sourceReader: ReadSourceUnitsDeps;
    resolvePackages: (entries: string[]) => Promise<string[]>;
    /** Injectable clock for deterministic tests. Defaults to Date.now. */
    now?: () => number;
}
export declare function runSearchSource(deps: OrchestratorDeps, input: OrchestratorInput): Promise<OrchestratorResult>;
export declare function runSearchSourceWithContext(ctx: HandlerContext, input: OrchestratorInput): Promise<OrchestratorResult>;
//# sourceMappingURL=orchestrator.d.ts.map