"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.describeAtcOutcome = describeAtcOutcome;
exports.handleRunAtc = handleRunAtc;
const atcCheckVariant_1 = require("../../../lib/atcCheckVariant");
const atcParser_1 = require("../../../lib/atcParser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'RunAtc',
    available_in: ['onprem', 'cloud'],
    description: '[analysis] Run ABAP Test Cockpit (ATC) checks on one or more objects/packages in a single run and return the findings (priority, check, message, location, quickfix info). Does not modify any checked object. Provide object_uri(s), or object_name + object_type, or an objects array. If check_variant is omitted, the system default ATC variant is used. Returns worklist_id — pass it to GetAtcWorklist to re-read findings later without re-running. objects_checked can be 0 for objects ATC does not cover: objects_not_checked names them with a reason, and the message then says the run is NOT a clean result. Correlate requested against checked by NAME — the worklist reports .../atc/objects/R3TR/<TYPE>/<NAME>, never the URI you passed, so a URI comparison matches nothing.',
    inputSchema: {
        type: 'object',
        properties: {
            object_name: {
                type: 'string',
                description: 'Name of a single object or package to check (e.g. YMFGR001 or YI_MFGR001_001). Used together with object_type.',
            },
            object_type: {
                type: 'string',
                enum: [
                    'package',
                    'view',
                    'class',
                    'interface',
                    'program',
                    'function_group',
                    'behavior_definition',
                    'metadata_extension',
                    'service_definition',
                    'table',
                    'structure',
                ],
                description: 'Type of the object referenced by object_name. "view" = CDS view (DDLS), "package" checks all objects in the package.',
            },
            objects: {
                type: 'array',
                description: 'Multiple objects to check in ONE ATC run. Each item: {object_name, object_type}.',
                items: {
                    type: 'object',
                    properties: {
                        object_name: { type: 'string' },
                        object_type: { type: 'string' },
                    },
                    required: ['object_name', 'object_type'],
                },
            },
            object_uris: {
                type: 'array',
                description: 'Full ADT object URIs (e.g. /sap/bc/adt/ddic/ddl/sources/yi_mfgr001_001). Overrides name/type inputs when provided.',
                items: { type: 'string' },
            },
            object_uri: {
                type: 'string',
                description: 'Single full ADT object URI (same as a 1-element object_uris).',
            },
            check_variant: {
                type: 'string',
                description: 'ATC check variant name. Default: the system default from ATC customizing. ' +
                    'An unknown name is REFUSED (verified against SCICHKV_HD); a USER-SCOPED variant ' +
                    'runs but is flagged. See Notes.',
            },
            max_results: {
                type: 'number',
                description: 'Maximum number of findings to return. Default: 100.',
            },
            include_exempted: {
                type: 'boolean',
                description: 'Include exempted findings. Default: false.',
            },
            max_priority: {
                type: 'number',
                description: 'Return only findings of this ATC priority or LOWER-numbered (i.e. more severe). ' +
                    'max_priority: 2 keeps priorities 1 and 2 and drops 3+. The counts in ' +
                    'findings_by_priority always cover the WHOLE run, so nothing is hidden — ' +
                    'filtered_out_count says how many were left out. Use this when the question is ' +
                    '"any priority <= 2?" and a full package run would otherwise return hundreds of ' +
                    'priority-3 findings.',
            },
            summary: {
                type: 'boolean',
                description: 'Return counts only, without the findings array. Default false. ' +
                    'Combine with max_priority to get a small answer from a large run.',
            },
        },
        required: [],
    },
    notes: `A PACKAGE RUN IS NOT A STATEMENT ABOUT THE PACKAGE. It expands into its members and examines only
the types the variant covers, so "N object(s)" reads as coverage when it is a fraction. Measured by a
reporting project: 2 of 74 objects checked in one package, 7 of ~128 in another — and a handover that
had said "priority 2 = 0" for weeks, covering six DCL access controls ATC had never opened.
objects_checked_by_type names what was actually examined, and the summary sentence says plainly that
everything else in the package was not looked at. Do NOT infer a fixed "covered types" list from any
one run: their runs saw CLAS, INTF, PROG, TABL and BDEF examined, while a run here over a package
holding active interfaces, tables and behaviour definitions came back CLAS only. For a definitive
requested-vs-present comparison on a package, read its contents with GetPackageContents and compare
against objects[].

WHAT WAS CHECKED IS REPORTED SEPARATELY FROM WHAT WAS FOUND, and the difference matters.
objects_requested vs objects_checked, plus objects_not_checked [{name, uri, reason}] for anything
asked for that produced no worklist entry. Measured: a data element, three CDS views and a large
projection view each came back objects_checked 0 with an empty object list — ATC simply does not
check those types under this system's variant. "No findings" is a claim about quality, so the
summary sentence never makes it when nothing was examined; it says the run is NOT a clean result.

ADT SUPPLIES NO REASON, so the reason is established here. Measured: a data element that EXISTS and
one that NEVER EXISTED produce byte-identical runs — same objects_checked 0, same empty list, the
same single FINDING_STATS "0,0,0". So each unchecked object is read back once: a 404 means the name
or type is wrong (a caller error worth failing on), anything else means the object is there and its
type is not covered. That read runs ONLY for objects that were not checked, so a normal run pays
nothing for it.

object_set_is_complete is SAP's own flag and is passed through, but do NOT read it as "everything was
checked": it came back true on a run that checked nothing.

Requested and checked are matched by NAME. The worklist reports an object as
/sap/bc/adt/atc/objects/R3TR/CLAS/<NAME>, which never equals the URI a caller passes. A package is
expected to expand into its members, so it counts as unchecked only when the expansion yields
nothing.

check_variant is verified against SCICHKV_HD before the run and an unknown
name is REFUSED. ADT accepts any variant name with HTTP 200 and silently falls
back to the system default, so a typo would otherwise produce findings for the
wrong variant — including a misleading "no findings". A variant that exists but
is USER-SCOPED (SCICHKV_HD-CIUSER non-blank) still runs, and the response sets
check_variant_user_scoped:true plus a warning naming the owner: findings
identical to a DEFAULT run over the same objects are the signal that the
endpoint ignored it. ADT does not report which variant a run actually used, so
the response echoes check_variant_requested plus check_variant_verified and
there is deliberately no "effective variant" field — such a field could only be
filled from the request, which is an echo wearing a verdict's name.

Findings are capped at a 60 KB budget, reported through findings_truncated /
findings_shown / findings_omitted. No severity class is dropped: priority 3 is
not noise, and a default that hides a whole class is the same defect pointed at
the caller.`,
};
const OBJECT_URI_TEMPLATES = {
    package: (n) => `/sap/bc/adt/packages/${n}`,
    view: (n) => `/sap/bc/adt/ddic/ddl/sources/${n}`,
    class: (n) => `/sap/bc/adt/oo/classes/${n}`,
    interface: (n) => `/sap/bc/adt/oo/interfaces/${n}`,
    program: (n) => `/sap/bc/adt/programs/programs/${n}`,
    function_group: (n) => `/sap/bc/adt/functions/groups/${n}`,
    behavior_definition: (n) => `/sap/bc/adt/bo/behaviordefinitions/${n}`,
    metadata_extension: (n) => `/sap/bc/adt/ddic/ddlx/sources/${n}`,
    service_definition: (n) => `/sap/bc/adt/ddic/srvd/sources/${n}`,
    table: (n) => `/sap/bc/adt/ddic/tables/${n}`,
    structure: (n) => `/sap/bc/adt/ddic/structures/${n}`,
    // Added because a reporting project had to hand-build these URIs: the tool
    // answered "Unsupported object_type", so they passed raw object_uris instead
    // and then could not tell that nothing had been checked. Accepting the type is
    // not a claim that ATC checks it — see the objects_not_checked reporting below,
    // which is what says whether it did.
    data_element: (n) => `/sap/bc/adt/ddic/dataelements/${n}`,
    domain: (n) => `/sap/bc/adt/ddic/domains/${n}`,
    table_type: (n) => `/sap/bc/adt/ddic/tabletypes/${n}`,
    message_class: (n) => `/sap/bc/adt/messageclass/${n}`,
    access_control: (n) => `/sap/bc/adt/acm/dcl/sources/${n}`,
};
/** The object NAME a requested URI refers to (its last path segment). */
function nameFromUri(uri) {
    const path = String(uri).split('?')[0].replace(/\/+$/, '');
    const last = path.slice(path.lastIndexOf('/') + 1);
    try {
        return decodeURIComponent(last).toUpperCase();
    }
    catch {
        return last.toUpperCase();
    }
}
/** A package is EXPECTED to expand into other objects, so it is never "unchecked". */
function isPackageUri(uri) {
    return /\/packages\//.test(String(uri));
}
/**
 * Why was this requested object absent from the worklist?
 *
 * MEASURED: ADT itself does not say. A data element that EXISTS and one that
 * NEVER EXISTED produce byte-identical runs — objects_checked 0, empty object
 * list, the same single FINDING_STATS "0,0,0" info, no message. So the reason
 * cannot be passed through from the run; it has to be established separately,
 * and the only question that can be answered cheaply is whether the object is
 * there at all. That is worth answering, because "not found" is a caller error
 * and "not covered by this variant" is not.
 *
 * Runs ONLY for objects that were not checked, so a normal run pays nothing.
 */
async function explainNotChecked(connection, uri) {
    try {
        await (0, utils_1.makeAdtRequestWithTimeout)(connection, uri, 'GET', 'default');
        return ('the object exists but the run returned no worklist entry for it — its type is ' +
            'most likely not covered by this check variant. ADT supplies no reason.');
    }
    catch (error) {
        if (error?.response?.status === 404) {
            return 'the object does not exist (or is not readable) at this URI — check the name and type.';
        }
        return 'no reason supplied by ADT, and its existence could not be confirmed.';
    }
}
function toUri(name, type) {
    const template = OBJECT_URI_TEMPLATES[type];
    if (!template) {
        throw new Error(`Unsupported object_type "${type}". Supported: ${Object.keys(OBJECT_URI_TEMPLATES).join(', ')}`);
    }
    return template((0, utils_1.encodeSapObjectName)(name.toLowerCase()));
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
function describeAtcOutcome(requested, checked, notChecked, findings, visibleFindings, maxPriority, 
/**
 * The distinct object types examined, when a PACKAGE was requested. A package
 * expands into its members, so "N object(s)" alone reads as though the package
 * was covered; naming the types is what tells a reader that everything else in
 * it was never opened.
 */
packageCheckedTypes) {
    if (checked === 0) {
        return (`ATC run completed. NONE of the ${requested} requested object(s) were checked — ` +
            'the run returned no worklist entry for them. THIS IS NOT A CLEAN RESULT: nothing ' +
            'was examined, so nothing can be said about these objects. See objects_not_checked.');
    }
    const scope = ` across ${checked} object(s)`;
    const filtered = maxPriority !== undefined && visibleFindings !== undefined
        ? `, ${visibleFindings} at priority <= ${maxPriority}`
        : '';
    const head = findings === 0
        ? `ATC run completed with no findings${scope}`
        : `ATC run completed with ${findings} finding(s)${scope}${filtered}`;
    if (notChecked > 0) {
        return (`${head}. ${notChecked} of the ${requested} requested object(s) were NOT checked and ` +
            'this result says nothing about them — see objects_not_checked.');
    }
    if (packageCheckedTypes?.length) {
        return (`${head}, of type(s) ${packageCheckedTypes.join(', ')}. A package run only examines the ` +
            'types this check variant covers; anything else in the package was NOT looked at, so ' +
            'this result is not a statement about the whole package.');
    }
    return `${head}.`;
}
async function handleRunAtc(context, args) {
    const { connection, logger } = context;
    try {
        const { object_name, object_type, objects, object_uris, object_uri, check_variant, max_results = 100, include_exempted = false, } = args ?? {};
        // Resolve the object URIs (priority: object_uris > object_uri > objects > name+type)
        let uris = [];
        if (object_uris?.length) {
            uris = object_uris;
        }
        else if (object_uri) {
            uris = [object_uri];
        }
        else if (objects?.length) {
            uris = objects.map((o) => toUri(o.object_name, o.object_type));
        }
        else if (object_name && object_type) {
            uris = [toUri(object_name, object_type)];
        }
        else {
            return (0, utils_1.return_error)(new Error('Provide object_uris / object_uri, or objects, or object_name together with object_type.'));
        }
        // 1. Resolve check variant (system default if none given).
        //
        // An explicitly requested variant is verified to EXIST first. ADT answers
        // HTTP 200 for a name that does not exist and quietly runs the system
        // default instead, so without this a typo reports a clean run of a variant
        // that was never used. See src/lib/atcCheckVariant.ts for the measurements.
        let variant = check_variant;
        let variantVerified = null;
        let variantUserScoped;
        let variantOwner;
        const variantWarnings = [];
        if (variant) {
            const verification = await (0, atcCheckVariant_1.verifyCheckVariantExists)(connection, variant);
            if (verification.exists === false) {
                return (0, utils_1.return_error)(new Error((0, atcCheckVariant_1.describeUnknownVariant)(variant)));
            }
            variantVerified = verification.exists === true ? true : null;
            if (verification.exists === undefined) {
                variantWarnings.push('The check variant could not be verified against SCICHKV_HD ' +
                    `(${verification.reason}). The run proceeded, but if the name does not ` +
                    'exist ADT silently used the system default instead.');
            }
            // A name-only lookup is not enough: a USER-SCOPED variant passes it and
            // the run may still silently be DEFAULT. See src/lib/atcCheckVariant.ts.
            if (verification.userScoped) {
                variantUserScoped = true;
                variantOwner = verification.owner;
                variantWarnings.push((0, atcCheckVariant_1.describeUserScopedVariant)(variant, verification.owner ?? ''));
            }
            else if (verification.exists === true) {
                variantUserScoped = false;
            }
        }
        if (!variant) {
            logger?.info('RunAtc: fetching default check variant from customizing');
            const customizingResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/atc/customizing', 'GET', 'default', undefined, undefined, {
                Accept: 'application/vnd.sap.atc.customizing-v1+xml, application/xml',
            });
            const customizing = (0, atcParser_1.parseAtcCustomizing)(String(customizingResp.data));
            variant = customizing.system_check_variant ?? undefined;
            if (!variant) {
                return (0, utils_1.return_error)(new Error('Could not determine the system default ATC check variant; pass check_variant explicitly.'));
            }
            logger?.info(`RunAtc: default check variant = ${variant}`);
        }
        // 2. Create worklist for the variant -> id returned as plain text
        const worklistResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/atc/worklists', 'POST', 'csrf', undefined, { checkVariant: variant }, { Accept: 'text/plain' });
        const worklistId = String(worklistResp.data).trim();
        if (!worklistId || worklistId.includes('<')) {
            return (0, utils_1.return_error)(new Error(`Unexpected worklist creation response: ${String(worklistResp.data).slice(0, 300)}`));
        }
        logger?.info(`RunAtc: worklist ${worklistId} (variant ${variant})`);
        // 3. Execute the ATC run (blocking; can take a while for packages)
        const runResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/atc/runs', 'POST', 300000, // ATC on packages can take minutes
        (0, atcParser_1.buildAtcRunBody)(uris, max_results), { worklistId }, { Accept: 'application/xml', 'Content-Type': 'application/xml' });
        const runParsed = (0, atcParser_1.parseAtcXml)(String(runResp.data));
        const worklistRun = runParsed?.worklistRun ?? {};
        const runInfos = (0, atcParser_1.asArray)(worklistRun?.infos?.info).map((i) => ({
            type: i.type ?? i['@_type'],
            description: i.description ?? i['@_description'],
        }));
        const timestamp = worklistRun?.worklistTimestamp;
        // 4. Fetch the worklist findings
        const findingsResp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, `/sap/bc/adt/atc/worklists/${worklistId}`, 'GET', 'long', undefined, {
            ...(timestamp ? { timestamp } : {}),
            includeExemptedFindings: include_exempted ? 'true' : 'false',
        }, { Accept: 'application/atc.worklist.v1+xml, application/xml' });
        const worklist = (0, atcParser_1.parseAtcWorklist)(String(findingsResp.data));
        logger?.info(`RunAtc: done — ${worklist.findings.length} finding(s) across ${worklist.objects.length} object(s)`);
        // R5-D1. THE RUN MUST NOT CLAIM A VERDICT FOR OBJECTS IT NEVER OPENED.
        //
        // Measured by a reporting project: a single data element, three CDS views,
        // and a large production projection view each came back objects_checked 0,
        // objects [], and the sentence "ATC run completed with no findings". That
        // sentence is a statement about the object's QUALITY; what happened is that
        // nothing was examined. It landed on exactly the objects they had just
        // created, and they were one careless reading away from writing "the 4 new
        // data elements pass ATC" into a handover — their false statement, sourced
        // from this tool's message string. Same family as R4-D1 and the round-2
        // false zeros.
        //
        // Requested and checked are matched by NAME, not by URI: the worklist reports
        // an object as /sap/bc/adt/atc/objects/R3TR/CLAS/<NAME>, which never equals
        // the URI the caller passed.
        const checkedNames = new Set(worklist.objects
            .map((o) => String(o?.name ?? '').toUpperCase())
            .filter(Boolean));
        const unmatchedUris = uris.filter((uri) => isPackageUri(uri)
            ? // A package is meant to expand into its members, so it is only
                // "not checked" when the expansion produced nothing at all.
                worklist.objects.length === 0
            : !checkedNames.has(nameFromUri(uri)));
        // WHICH TYPES were examined. For a PACKAGE run this is the only honest signal
        // available for free: the package expands into its members, so a caller who
        // sees "8 object(s)" for a 128-object package has nothing telling them the
        // other 120 were never opened.
        //
        // Measured by a reporting project across four real packages: one reported 2
        // checked objects out of 74, another 7 out of ~128. Their handover had said
        // "priority 2 = 0" for weeks, which a reader takes as a statement about the
        // whole package — including six DCL access controls, the row-level
        // authorisation layer, that ATC had never looked at once.
        //
        // DO NOT hard-code a "covered types" list from that. Their runs saw CLAS,
        // INTF, PROG, TABL and BDEF examined; a run here over a package containing
        // active interfaces, tables and behaviour definitions came back with CLAS
        // ONLY. So which types a variant opens is not a fixed set to be predicted —
        // it is a thing to be REPORTED per run, which is what this does.
        const checkedByType = {};
        for (const obj of worklist.objects) {
            const type = String(obj?.type ?? '').toUpperCase() || 'UNKNOWN';
            checkedByType[type] = (checkedByType[type] ?? 0) + 1;
        }
        const requestedPackage = uris.some(isPackageUri);
        const objectsNotChecked = [];
        for (const uri of unmatchedUris) {
            objectsNotChecked.push({
                name: nameFromUri(uri),
                uri,
                reason: await explainNotChecked(connection, uri),
            });
        }
        // A lower ATC priority NUMBER is more severe, so max_priority is an upper
        // bound on the number.
        const maxPriority = typeof args.max_priority === 'number' &&
            Number.isFinite(args.max_priority)
            ? args.max_priority
            : undefined;
        const visibleFindings = maxPriority === undefined
            ? worklist.findings
            : worklist.findings.filter((f) => f.priority <= maxPriority);
        // SIZE CAP (field report round 3, Tier 2). Five of 65 runs returned more
        // than the tool-output limit and had to be spilled to a file and
        // post-processed with shell commands.
        //
        // The reporter asked for `max_priority: 2` as the DEFAULT instead. That is
        // NOT done here, deliberately: it would drop every priority-3 finding from
        // every run that does not opt out, and priority 3 is not noise — their own
        // round 2 tracked four priority-3 findings as the measure of a fix. A
        // default that silently hides a whole severity class is the same defect
        // class as the echoes this round is about, just pointed at the caller.
        //
        // A byte cap hides nothing by category: the findings are returned in the
        // order SAP reported them until the budget runs out, and the response then
        // says exactly how many were left out and how to narrow the run.
        const FINDINGS_BUDGET_BYTES = 60_000;
        let budget = FINDINGS_BUDGET_BYTES;
        const shownFindings = [];
        for (const finding of visibleFindings) {
            const size = JSON.stringify(finding).length;
            if (budget - size < 0 && shownFindings.length > 0)
                break;
            budget -= size;
            shownFindings.push(finding);
        }
        const cappedCount = visibleFindings.length - shownFindings.length;
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                // ECHO, not a verdict: this is the name that was REQUESTED (or the
                // system default that was looked up when none was given). ADT does
                // not report the variant a run actually used, so nothing here can
                // claim to be the effective one.
                check_variant_requested: variant,
                check_variant_verified: variantVerified,
                ...(variantUserScoped !== undefined
                    ? { check_variant_user_scoped: variantUserScoped }
                    : {}),
                ...(variantOwner ? { check_variant_owner: variantOwner } : {}),
                ...(variantWarnings.length
                    ? { check_variant_warnings: variantWarnings }
                    : {}),
                worklist_id: worklistId,
                worklist_timestamp: timestamp ?? worklist.worklist_timestamp,
                object_uris: uris,
                run_infos: runInfos,
                objects_requested: uris.length,
                objects_checked: worklist.objects.length,
                objects: worklist.objects,
                ...(objectsNotChecked.length
                    ? { objects_not_checked: objectsNotChecked }
                    : {}),
                // SAP's own statement about whether the object set was fully resolved.
                // Parsed since round 1 and never surfaced until now; it belongs next to
                // the counts it qualifies.
                ...(worklist.objects.length
                    ? { objects_checked_by_type: checkedByType }
                    : {}),
                ...(worklist.object_set_is_complete !== null
                    ? { object_set_is_complete: worklist.object_set_is_complete }
                    : {}),
                // finding_count and findings_by_priority describe the WHOLE run, so a
                // filter can never make a run look cleaner than it was.
                finding_count: worklist.findings.length,
                findings_by_priority: (0, atcParser_1.findingsByPriority)(worklist.findings),
                ...(maxPriority !== undefined
                    ? {
                        max_priority: maxPriority,
                        returned_finding_count: visibleFindings.length,
                        filtered_out_count: worklist.findings.length - visibleFindings.length,
                    }
                    : {}),
                ...(args.summary === true
                    ? {
                        summary: true,
                        findings_omitted: 'summary:true was requested — counts only. Re-run without it, or with ' +
                            'GetAtcWorklist and this worklist_id, to see the findings.',
                    }
                    : {
                        findings: shownFindings,
                        ...(cappedCount > 0
                            ? {
                                findings_truncated: true,
                                findings_shown: shownFindings.length,
                                findings_omitted: cappedCount,
                                findings_truncation_note: `${cappedCount} finding(s) were not listed because the response would ` +
                                    'have exceeded the tool-output limit. The counts above still describe ' +
                                    'the WHOLE run. Narrow with max_priority, or re-read this worklist_id ' +
                                    'with GetAtcWorklist.',
                            }
                            : {}),
                    }),
                message: describeAtcOutcome(uris.length, worklist.objects.length, objectsNotChecked.length, worklist.findings.length, maxPriority === undefined ? undefined : visibleFindings.length, maxPriority, requestedPackage ? Object.keys(checkedByType).sort() : undefined),
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`RunAtc failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleRunAtc.js.map