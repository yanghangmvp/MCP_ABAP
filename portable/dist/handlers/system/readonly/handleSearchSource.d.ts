import * as z from 'zod';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type OrchestratorInput } from '../../../lib/search-source/orchestrator';
export declare const TOOL_DEFINITION: {
    readonly name: "SearchSource";
    readonly available_in: readonly ["onprem", "legacy"];
    readonly description: string;
    readonly inputSchema: {
        readonly query: z.ZodString;
        readonly query2: z.ZodOptional<z.ZodString>;
        readonly exclude: z.ZodOptional<z.ZodArray<z.ZodString>>;
        readonly packages: z.ZodArray<z.ZodString>;
        readonly include_subpackages: z.ZodOptional<z.ZodBoolean>;
        readonly object_filter: z.ZodOptional<z.ZodString>;
        readonly object_types: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            CLAS: "CLAS";
            PROG: "PROG";
            FUGR: "FUGR";
        }>>>;
        readonly exclude_comments: z.ZodOptional<z.ZodBoolean>;
        readonly max_hits_per_object: z.ZodOptional<z.ZodNumber>;
        readonly emit_no_hits: z.ZodOptional<z.ZodBoolean>;
        readonly max_objects: z.ZodOptional<z.ZodNumber>;
        readonly concurrency: z.ZodOptional<z.ZodNumber>;
        readonly version: z.ZodOptional<z.ZodEnum<{
            active: "active";
            inactive: "inactive";
        }>>;
        readonly class_includes: z.ZodOptional<z.ZodBoolean>;
        readonly hits_only: z.ZodOptional<z.ZodBoolean>;
        readonly max_bytes: z.ZodOptional<z.ZodNumber>;
        readonly time_budget_ms: z.ZodOptional<z.ZodNumber>;
    };
    readonly notes: "packages accepts * masks (Z*, ZFI_*, /NS/Z*) alongside exact names, but mask\nresolution is best-effort and scoped to the ADT repository-search result window\n— there is no guarantee every matching package is scanned. If you need\ncertainty, pass concrete package names. `packages` is PACKAGE names (DEVC), not\nobject names; passing * enumerates the whole repository and can take minutes.\nobject_filter is applied AFTER enumeration, so it does not reduce scan cost.\n\nComments are searched by default; exclude_comments=true drops col-1 * and\nfull-line \" comments. The version parameter affects PROG and CLAS main-include\nreads only — FUGR subinclude reads always go against the active version,\nbecause the include endpoint exposes no version selector.\n\ntruncated.by_object_cap means at least one object had MORE hits than\nmax_hits_per_object, so that object's hits were capped. It is NOT a limit on the\nnumber of objects scanned — that is max_objects, which sets\ntruncated.by_max_objects. To avoid by_object_cap, raise max_hits_per_object.\n\nCOVERAGE (I-23). A class is scanned as FIVE source units: source/main plus the\nCCDEF / CCIMP / CCAU / CCMAC includes, which source/main does NOT contain.\nMeasured on S/4HANA 2023 FPS02: a RAP behavior pool's source/main is a 7-line\nskeleton while its CCIMP holds the 89 lines of actual handler logic, and a class\nwith 227 lines in main had 394 more in its testclasses include. Scanning main\nalone therefore answers \"no hits\" for code it never opened. Hits name the unit\nthey came from, e.g. \"ZCL_X (CCIMP)\". class_includes=false restores the old\nmain-only behaviour when speed matters more than coverage.\n\nscanned.source_lines is the honest coverage figure — judge a zero-hit result by\nit, not by scanned.objects. read_failures lists units that could not be read at\nall; a failed read yields no hits and would otherwise be indistinguishable from\n\"no match\".\n\nconcurrency is capped at 16 per call. Multiple parallel SearchSource calls\nagainst one SAP system saturate the scan backend and can make all of them time\nout; prefer combining terms into a single call.";
};
type SearchSourceArgs = OrchestratorInput;
export declare function handleSearchSource(context: HandlerContext, args: SearchSourceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleSearchSource.d.ts.map