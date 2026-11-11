/**
 * RunAtc Handler - Run ABAP Test Cockpit (ATC) checks on one or more objects / packages
 *
 * Uses the ADT ATC REST endpoints directly (no adt-clients support yet):
 *   1. GET  /sap/bc/adt/atc/customizing                  -> default check variant (if none given)
 *   2. POST /sap/bc/adt/atc/worklists?checkVariant=...   -> worklist id (plain text)
 *   3. POST /sap/bc/adt/atc/runs?worklistId=...          -> executes ATC run (blocking)
 *   4. GET  /sap/bc/adt/atc/worklists/{id}               -> findings
 *
 * Flow and field coverage aligned with abap-adt-api (atcCheckVariant/createAtcRun/
 * atcWorklists), plus multi-object object sets in a single run.
 *
 * Read-only from a development-object perspective: ATC creates a server-side
 * worklist but never modifies checked objects.
 *
 * Deliberately NOT implemented: exemption requests (atcRequestExemption etc.) —
 * suppressing findings must stay a human decision.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "RunAtc";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[analysis] Run ABAP Test Cockpit (ATC) checks on one or more objects/packages in a single run and return the findings (priority, check, message, location, quickfix info). Does not modify any checked object. Provide object_uri(s), or object_name + object_type, or an objects array. If check_variant is omitted, the system default ATC variant is used. Returns worklist_id — pass it to GetAtcWorklist to re-read findings later without re-running. objects_checked can be 0 for objects ATC does not cover: objects_not_checked names them with a reason, and the message then says the run is NOT a clean result. Correlate requested against checked by NAME — the worklist reports .../atc/objects/R3TR/<TYPE>/<NAME>, never the URI you passed, so a URI comparison matches nothing.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Name of a single object or package to check (e.g. YMFGR001 or YI_MFGR001_001). Used together with object_type.";
            };
            readonly object_type: {
                readonly type: "string";
                readonly enum: readonly ["package", "view", "class", "interface", "program", "function_group", "behavior_definition", "metadata_extension", "service_definition", "table", "structure"];
                readonly description: "Type of the object referenced by object_name. \"view\" = CDS view (DDLS), \"package\" checks all objects in the package.";
            };
            readonly objects: {
                readonly type: "array";
                readonly description: "Multiple objects to check in ONE ATC run. Each item: {object_name, object_type}.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly object_name: {
                            readonly type: "string";
                        };
                        readonly object_type: {
                            readonly type: "string";
                        };
                    };
                    readonly required: readonly ["object_name", "object_type"];
                };
            };
            readonly object_uris: {
                readonly type: "array";
                readonly description: "Full ADT object URIs (e.g. /sap/bc/adt/ddic/ddl/sources/yi_mfgr001_001). Overrides name/type inputs when provided.";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly object_uri: {
                readonly type: "string";
                readonly description: "Single full ADT object URI (same as a 1-element object_uris).";
            };
            readonly check_variant: {
                readonly type: "string";
                readonly description: string;
            };
            readonly max_results: {
                readonly type: "number";
                readonly description: "Maximum number of findings to return. Default: 100.";
            };
            readonly include_exempted: {
                readonly type: "boolean";
                readonly description: "Include exempted findings. Default: false.";
            };
            readonly max_priority: {
                readonly type: "number";
                readonly description: string;
            };
            readonly summary: {
                readonly type: "boolean";
                readonly description: string;
            };
        };
        readonly required: readonly [];
    };
    readonly notes: "A PACKAGE RUN IS NOT A STATEMENT ABOUT THE PACKAGE. It expands into its members and examines only\nthe types the variant covers, so \"N object(s)\" reads as coverage when it is a fraction. Measured by a\nreporting project: 2 of 74 objects checked in one package, 7 of ~128 in another — and a handover that\nhad said \"priority 2 = 0\" for weeks, covering six DCL access controls ATC had never opened.\nobjects_checked_by_type names what was actually examined, and the summary sentence says plainly that\neverything else in the package was not looked at. Do NOT infer a fixed \"covered types\" list from any\none run: their runs saw CLAS, INTF, PROG, TABL and BDEF examined, while a run here over a package\nholding active interfaces, tables and behaviour definitions came back CLAS only. For a definitive\nrequested-vs-present comparison on a package, read its contents with GetPackageContents and compare\nagainst objects[].\n\nWHAT WAS CHECKED IS REPORTED SEPARATELY FROM WHAT WAS FOUND, and the difference matters.\nobjects_requested vs objects_checked, plus objects_not_checked [{name, uri, reason}] for anything\nasked for that produced no worklist entry. Measured: a data element, three CDS views and a large\nprojection view each came back objects_checked 0 with an empty object list — ATC simply does not\ncheck those types under this system's variant. \"No findings\" is a claim about quality, so the\nsummary sentence never makes it when nothing was examined; it says the run is NOT a clean result.\n\nADT SUPPLIES NO REASON, so the reason is established here. Measured: a data element that EXISTS and\none that NEVER EXISTED produce byte-identical runs — same objects_checked 0, same empty list, the\nsame single FINDING_STATS \"0,0,0\". So each unchecked object is read back once: a 404 means the name\nor type is wrong (a caller error worth failing on), anything else means the object is there and its\ntype is not covered. That read runs ONLY for objects that were not checked, so a normal run pays\nnothing for it.\n\nobject_set_is_complete is SAP's own flag and is passed through, but do NOT read it as \"everything was\nchecked\": it came back true on a run that checked nothing.\n\nRequested and checked are matched by NAME. The worklist reports an object as\n/sap/bc/adt/atc/objects/R3TR/CLAS/<NAME>, which never equals the URI a caller passes. A package is\nexpected to expand into its members, so it counts as unchecked only when the expansion yields\nnothing.\n\ncheck_variant is verified against SCICHKV_HD before the run and an unknown\nname is REFUSED. ADT accepts any variant name with HTTP 200 and silently falls\nback to the system default, so a typo would otherwise produce findings for the\nwrong variant — including a misleading \"no findings\". A variant that exists but\nis USER-SCOPED (SCICHKV_HD-CIUSER non-blank) still runs, and the response sets\ncheck_variant_user_scoped:true plus a warning naming the owner: findings\nidentical to a DEFAULT run over the same objects are the signal that the\nendpoint ignored it. ADT does not report which variant a run actually used, so\nthe response echoes check_variant_requested plus check_variant_verified and\nthere is deliberately no \"effective variant\" field — such a field could only be\nfilled from the request, which is an echo wearing a verdict's name.\n\nFindings are capped at a 60 KB budget, reported through findings_truncated /\nfindings_shown / findings_omitted. No severity class is dropped: priority 3 is\nnot noise, and a default that hides a whole class is the same defect pointed at\nthe caller.";
};
interface RunAtcArgs {
    max_priority?: number;
    summary?: boolean;
    object_name?: string;
    object_type?: string;
    objects?: Array<{
        object_name: string;
        object_type: string;
    }>;
    object_uris?: string[];
    object_uri?: string;
    check_variant?: string;
    max_results?: number;
    include_exempted?: boolean;
}
/**
 * The one-line outcome, derived from what was actually examined.
 *
 * The rule this exists to enforce: the phrase "no findings" is a claim about
 * quality, and it may only be made about objects that were CHECKED. When nothing
 * was checked the sentence has to say so, and say that it is not a clean result
 * — a caller reading only this line (a log, a summary, an agent grepping for it)
 * must not come away with a verdict that was never earned.
 */
export declare function describeAtcOutcome(requested: number, checked: number, notChecked: number, findings: number, visibleFindings?: number, maxPriority?: number, 
/**
 * The distinct object types examined, when a PACKAGE was requested. A package
 * expands into its members, so "N object(s)" alone reads as though the package
 * was covered; naming the types is what tells a reader that everything else in
 * it was never opened.
 */
packageCheckedTypes?: string[]): string;
export declare function handleRunAtc(context: HandlerContext, args: RunAtcArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleRunAtc.d.ts.map