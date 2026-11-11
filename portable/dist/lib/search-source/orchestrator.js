"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSearchSource = runSearchSource;
exports.runSearchSourceWithContext = runSearchSourceWithContext;
const lineScanner_1 = require("./lineScanner");
const packageEnumerator_1 = require("./packageEnumerator");
const packageResolver_1 = require("./packageResolver");
const sourceReader_1 = require("./sourceReader");
const DEFAULTS = {
    include_subpackages: true,
    object_types: ['PROG', 'FUGR', 'CLAS'],
    exclude_comments: false,
    max_hits_per_object: 100,
    emit_no_hits: false,
    max_objects: 500,
    concurrency: 8,
    version: 'active',
};
async function runWithLimit(items, limit, worker, onStop, shouldStop) {
    let next = 0;
    async function pump() {
        while (true) {
            if (shouldStop?.()) {
                onStop?.();
                return;
            }
            const idx = next++;
            if (idx >= items.length)
                return;
            await worker(items[idx]);
        }
    }
    const n = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: n }, () => pump()));
}
async function runSearchSource(deps, input) {
    if (!input.query || input.query.length === 0) {
        throw new Error('query must be a non-empty string');
    }
    if (!input.packages || input.packages.length === 0) {
        throw new Error('packages must contain at least one entry');
    }
    if (input.exclude && input.exclude.length > 3) {
        throw new Error('exclude may not contain more than 3 entries');
    }
    const maxHits = input.max_hits_per_object ?? DEFAULTS.max_hits_per_object;
    const maxObjects = input.max_objects ?? DEFAULTS.max_objects;
    const concurrency = Math.min(16, Math.max(1, input.concurrency ?? DEFAULTS.concurrency));
    const emitNoHits = input.emit_no_hits ?? DEFAULTS.emit_no_hits;
    const version = input.version ?? DEFAULTS.version;
    const now = deps.now ?? Date.now;
    const timeBudgetMs = input.time_budget_ms != null && input.time_budget_ms > 0
        ? input.time_budget_ms
        : null;
    const deadline = timeBudgetMs != null ? now() + timeBudgetMs : null;
    const deadlinePassed = () => deadline != null && now() >= deadline;
    const resolvedPackages = await deps.resolvePackages(input.packages);
    const enumerateInput = {
        packages: resolvedPackages,
        include_subpackages: input.include_subpackages ?? DEFAULTS.include_subpackages,
        object_filter: input.object_filter,
        object_types: input.object_types ?? DEFAULTS.object_types,
    };
    const allTargets = resolvedPackages.length === 0
        ? []
        : await (0, packageEnumerator_1.enumerateScanTargets)(deps.fetchPackageContents, enumerateInput);
    const truncatedByMaxObjects = allTargets.length > maxObjects;
    const targets = truncatedByMaxObjects
        ? allTargets.slice(0, maxObjects)
        : allTargets;
    const allHits = [];
    const noHits = [];
    const readFailures = [];
    let sourcesScanned = 0;
    let sourceLinesScanned = 0;
    let truncatedByObjectCap = false;
    let timedOut = false;
    await runWithLimit(targets, concurrency, async (target) => {
        let totalForTarget = 0;
        let capHitForTarget = false;
        const targetHits = [];
        for await (const unit of (0, sourceReader_1.readSourceUnits)(deps.sourceReader, target, version, {
            classIncludes: input.class_includes,
            onReadFailure: (failure) => readFailures.push(failure),
        })) {
            if (deadlinePassed()) {
                timedOut = true;
                break;
            }
            sourcesScanned++;
            sourceLinesScanned += unit.lines.length;
            const remaining = maxHits - totalForTarget;
            if (remaining <= 0) {
                const probe = (0, lineScanner_1.scanLines)(unit.lines, {
                    query: input.query,
                    query2: input.query2,
                    exclude: input.exclude,
                    exclude_comments: input.exclude_comments,
                    max_hits: 1,
                });
                if (probe.hits.length > 0) {
                    capHitForTarget = true;
                    break;
                }
                continue;
            }
            const scan = (0, lineScanner_1.scanLines)(unit.lines, {
                query: input.query,
                query2: input.query2,
                exclude: input.exclude,
                exclude_comments: input.exclude_comments,
                max_hits: remaining,
            });
            for (const h of scan.hits) {
                targetHits.push({
                    devclass: target.devclass,
                    object_type: target.object_type,
                    object_name: target.object_name,
                    include: unit.include,
                    line: h.line,
                    snippet: h.snippet,
                });
            }
            totalForTarget += scan.hits.length;
            if (scan.capped) {
                capHitForTarget = true;
                break;
            }
        }
        if (capHitForTarget)
            truncatedByObjectCap = true;
        if (targetHits.length === 0 && emitNoHits) {
            noHits.push({
                devclass: target.devclass,
                object_type: target.object_type,
                object_name: target.object_name,
            });
        }
        else {
            allHits.push(...targetHits);
        }
    }, () => {
        // onStop may be called by multiple pump coroutines under concurrency > 1; setting a boolean is idempotent.
        timedOut = true;
    }, deadlinePassed);
    allHits.sort((a, b) => {
        if (a.devclass !== b.devclass)
            return a.devclass < b.devclass ? -1 : 1;
        if (a.object_name !== b.object_name)
            return a.object_name < b.object_name ? -1 : 1;
        if (a.include !== b.include)
            return a.include < b.include ? -1 : 1;
        return a.line - b.line;
    });
    if (emitNoHits) {
        noHits.sort((a, b) => {
            if (a.devclass !== b.devclass)
                return a.devclass < b.devclass ? -1 : 1;
            if (a.object_type !== b.object_type)
                return a.object_type < b.object_type ? -1 : 1;
            return a.object_name < b.object_name ? -1 : 1;
        });
    }
    const shaped = input.hits_only
        ? allHits.map((hit) => ({
            object: hit.object_name,
            include: hit.include,
            line: hit.line,
            text: hit.snippet,
        }))
        : allHits;
    // max_bytes trims the LIST, never a hit: a half-serialized entry would be
    // worse than a missing one. Whatever is dropped is counted, so the caller is
    // never shown a short list that looks complete.
    let results = shaped;
    let omitted = 0;
    let truncatedByMaxBytes = false;
    if (input.max_bytes != null && input.max_bytes > 0) {
        const kept = [];
        let used = 2; // the enclosing []
        for (const hit of shaped) {
            const size = JSON.stringify(hit).length + 1; // + separator
            if (used + size > input.max_bytes)
                break;
            used += size;
            kept.push(hit);
        }
        if (kept.length < shaped.length) {
            omitted = shaped.length - kept.length;
            truncatedByMaxBytes = true;
            results = kept;
        }
    }
    const result = {
        results,
        scanned: {
            packages: resolvedPackages.length,
            objects: targets.length,
            sources: sourcesScanned,
            source_lines: sourceLinesScanned,
            read_failures: readFailures.length,
        },
        truncated: {
            by_object_cap: truncatedByObjectCap,
            by_max_objects: truncatedByMaxObjects,
            by_timeout: timedOut,
            by_max_bytes: truncatedByMaxBytes,
        },
    };
    if (emitNoHits)
        result.no_hits = noHits;
    if (readFailures.length > 0)
        result.read_failures = readFailures;
    if (omitted > 0)
        result.results_omitted = omitted;
    return result;
}
function runSearchSourceWithContext(ctx, input) {
    const searchObjects = (0, packageResolver_1.createPackagePatternResolver)(ctx);
    const resolverDeps = { searchObjects };
    return runSearchSource({
        fetchPackageContents: (0, packageEnumerator_1.createPackageContentsFetcher)(ctx),
        sourceReader: (0, sourceReader_1.createSourceReaderDeps)(ctx),
        resolvePackages: (entries) => (0, packageResolver_1.resolvePackagePatterns)(resolverDeps, entries),
    }, input);
}
//# sourceMappingURL=orchestrator.js.map