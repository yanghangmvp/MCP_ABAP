"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleSearchSource = handleSearchSource;
const z = __importStar(require("zod"));
const orchestrator_1 = require("../../../lib/search-source/orchestrator");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'SearchSource',
    available_in: ['onprem', 'legacy'],
    description: '[read-only] Scan ABAP source text inside one or more PACKAGES (programs, function ' +
        'groups, classes). Onprem-only. ⚠️ This is a SCANNER, not a retriever — if you already ' +
        'know the object name, use GetProgram / GetClass / GetInclude / GetFunctionModule / ' +
        'GetStructure / GetTable instead; they are orders of magnitude faster. Narrowing ' +
        '`packages` is the only thing that makes a scan fast. Run ONE SearchSource per ' +
        'destination at a time. See Notes for masks, truncation flags and version behaviour.',
    inputSchema: {
        query: z
            .string()
            .min(1)
            .describe('Primary substring to match (case-insensitive, ABAP CS).'),
        query2: z
            .string()
            .optional()
            .describe('Optional second substring. When set, both query and query2 must appear on the same line.'),
        exclude: z
            .array(z.string())
            .max(3)
            .optional()
            .describe('Up to 3 substrings; a line containing any of them is dropped.'),
        packages: z
            .array(z.string().min(1), {
            // The bare zod message ("expected array, received undefined") named the
            // field and nothing else, so a caller had no way to guess what belongs
            // in it. Two calls died on exactly that. Name a workable default.
            error: (issue) => issue.input === undefined
                ? 'packages is required: the package name(s) to scan, e.g. ["$TMP"] for local ' +
                    'objects, ["ZMY_PACKAGE"] for one package, or a mask like ["ZMY_*"]. ' +
                    'These are package (DEVC) names, NOT object names. If you already know the ' +
                    'object name, use GetClass / GetProgram / GetInclude instead — SearchSource is ' +
                    'a scanner, not a retriever.'
                : undefined,
        })
            .min(1)
            .describe('Packages to scan. Each entry is either an exact dev-class name or a `*` mask (* = any chars). Examples: "ZFI_OBSOLETE", "Z*", "ZFI_*", "/NS/Z*". These are package (DEVC) names, not object names.'),
        include_subpackages: z
            .boolean()
            .optional()
            .describe('Recurse into subpackages (default true).'),
        object_filter: z
            .string()
            .optional()
            .describe('Glob applied to object names within each package (e.g. "Z*").'),
        object_types: z
            .array(z.enum(['PROG', 'FUGR', 'CLAS']))
            .optional()
            .describe('Subset of object families to scan (default: all three).'),
        exclude_comments: z
            .boolean()
            .optional()
            .describe("Skip col-1 '*' and full-line '\"' comment lines. Default false (comments are scanned)."),
        max_hits_per_object: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Cap hits per root object across its source units (default 100). When exceeded, truncated.by_object_cap=true is set. Raise this value if you need more hits per object.'),
        emit_no_hits: z
            .boolean()
            .optional()
            .describe('When true, list zero-hit targets in a separate no_hits array. Default false.'),
        max_objects: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Cap the total objects scanned across all packages (default 500). Setting truncated.by_max_objects=true when exceeded.'),
        concurrency: z
            .number()
            .int()
            .min(1)
            .max(16)
            .optional()
            .describe('Parallel source fetches (default 8, max 16).'),
        version: z
            .enum(['active', 'inactive'])
            .optional()
            .describe('Source version for PROG and CLAS main include reads. Default active. FUGR subincludes always read the active version.'),
        class_includes: z
            .boolean()
            .optional()
            .describe("Also scan a class's CCDEF/CCIMP/CCAU/CCMAC includes (default true). source/main does NOT contain them. Set false only to trade coverage for speed — it costs 4 reads per class."),
        hits_only: z
            .boolean()
            .optional()
            .describe('Return the compact shape {object, include, line, text} instead of the full hit. Default false.'),
        max_bytes: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Cap the serialized size of results. Whole hits are dropped from the end; truncated.by_max_bytes and results_omitted report what was cut.'),
        time_budget_ms: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Internal scan deadline in ms. When exceeded, returns hits gathered so far with truncated.by_timeout=true. Set this BELOW your client/transport timeout (e.g. 540000 for a 600s client) so you get a partial result instead of a hard cutoff.'),
    },
    notes: `packages accepts * masks (Z*, ZFI_*, /NS/Z*) alongside exact names, but mask
resolution is best-effort and scoped to the ADT repository-search result window
— there is no guarantee every matching package is scanned. If you need
certainty, pass concrete package names. \`packages\` is PACKAGE names (DEVC), not
object names; passing * enumerates the whole repository and can take minutes.
object_filter is applied AFTER enumeration, so it does not reduce scan cost.

Comments are searched by default; exclude_comments=true drops col-1 * and
full-line " comments. The version parameter affects PROG and CLAS main-include
reads only — FUGR subinclude reads always go against the active version,
because the include endpoint exposes no version selector.

truncated.by_object_cap means at least one object had MORE hits than
max_hits_per_object, so that object's hits were capped. It is NOT a limit on the
number of objects scanned — that is max_objects, which sets
truncated.by_max_objects. To avoid by_object_cap, raise max_hits_per_object.

COVERAGE (I-23). A class is scanned as FIVE source units: source/main plus the
CCDEF / CCIMP / CCAU / CCMAC includes, which source/main does NOT contain.
Measured on S/4HANA 2023 FPS02: a RAP behavior pool's source/main is a 7-line
skeleton while its CCIMP holds the 89 lines of actual handler logic, and a class
with 227 lines in main had 394 more in its testclasses include. Scanning main
alone therefore answers "no hits" for code it never opened. Hits name the unit
they came from, e.g. "ZCL_X (CCIMP)". class_includes=false restores the old
main-only behaviour when speed matters more than coverage.

scanned.source_lines is the honest coverage figure — judge a zero-hit result by
it, not by scanned.objects. read_failures lists units that could not be read at
all; a failed read yields no hits and would otherwise be indistinguishable from
"no match".

concurrency is capped at 16 per call. Multiple parallel SearchSource calls
against one SAP system saturate the scan backend and can make all of them time
out; prefer combining terms into a single call.`,
};
async function handleSearchSource(context, args) {
    const { logger } = context;
    try {
        const result = await (0, orchestrator_1.runSearchSourceWithContext)(context, args);
        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        logger?.error(`SearchSource failed: ${error instanceof Error ? error.message : String(error)}`);
        return (0, utils_1.return_error)(error instanceof Error ? error : new Error(String(error)));
    }
}
//# sourceMappingURL=handleSearchSource.js.map