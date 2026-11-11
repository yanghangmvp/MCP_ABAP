"use strict";
/**
 * Synchronous ABAP Unit test run — in-repo bypass of the adt-clients dep.
 *
 * The dep's getUnitTest().create()/run() POSTs to /sap/bc/adt/abapunit/runs
 * (an async run-ID + poll model). That endpoint returns 404 on S/4 7.56
 * (verified live on DM2), so the whole unit-test *run* path never worked live.
 *
 * The authoritative reference (abap-adt-api) and the dep's OWN runLegacy both
 * use /sap/bc/adt/abapunit/testruns with an aunit:runConfiguration body that
 * references objects by URI and returns the aunit:runResult SYNCHRONOUSLY from
 * the POST — no run ID, no polling. The dep only selects that path for
 * BASIS < 7.50 systems, but /testruns is in fact what works on 7.56 too. This
 * module drives /testruns directly (same "in-repo bypass" pattern as
 * activateAdtObjects and runObjectCheckRun).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUnitTestRunXml = buildUnitTestRunXml;
exports.startUnitTestRunSync = startUnitTestRunSync;
exports.parseUnitTestRunResult = parseUnitTestRunResult;
exports.extractUnitTestRunId = extractUnitTestRunId;
const fast_xml_parser_1 = require("fast-xml-parser");
const utils_1 = require("./utils");
function boolAttr(v, fallback) {
    return (v ?? fallback) ? 'true' : 'false';
}
/**
 * Build the aunit:runConfiguration body for the /testruns POST. Exported for
 * testing — the <options> block (esp. <testDeterminationStrategy>) is what makes
 * SAP actually determine + run tests; omit it and the run returns an empty
 * result with HTTP 200.
 */
function buildUnitTestRunXml(tests, options) {
    // Dedupe container classes — the objectSet references the class object.
    const seen = new Set();
    const objectRefs = tests
        .map((t) => (0, utils_1.encodeSapObjectName)(t.containerClass).toLowerCase())
        .filter((cls) => {
        if (seen.has(cls))
            return false;
        seen.add(cls);
        return true;
    })
        .map((cls) => `        <adtcore:objectReference adtcore:uri="/sap/bc/adt/oo/classes/${cls}"/>`)
        .join('\n');
    // The <options> block is MANDATORY, not optional: without
    // <testDeterminationStrategy> (and <uriType>) SAP determines NO tests to run
    // and returns an empty <aunit:runResult/> with HTTP 200 — a silent no-op.
    // Risk/duration default to all-true so every test of the class actually runs
    // (a caller can narrow via options.riskLevel/duration).
    const risk = options?.riskLevel;
    const duration = options?.duration;
    const optionsXml = `  <options>\n` +
        `    <uriType value="semantic"/>\n` +
        `    <testDeterminationStrategy sameProgram="true" assignedTests="false"/>\n` +
        `    <testRiskLevels harmless="${boolAttr(risk?.harmless, true)}" dangerous="${boolAttr(risk?.dangerous, true)}" critical="${boolAttr(risk?.critical, true)}"/>\n` +
        `    <testDurations short="${boolAttr(duration?.short, true)}" medium="${boolAttr(duration?.medium, true)}" long="${boolAttr(duration?.long, true)}"/>\n` +
        `    <withNavigationUri enabled="true"/>\n` +
        `  </options>\n`;
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<aunit:runConfiguration xmlns:aunit="http://www.sap.com/adt/aunit">\n` +
        `  <external>\n    <coverage active="false"/>\n  </external>\n` +
        optionsXml +
        `  <adtcore:objectSets xmlns:adtcore="http://www.sap.com/adt/core">\n` +
        `    <objectSet kind="inclusive">\n` +
        `      <adtcore:objectReferences>\n${objectRefs}\n      </adtcore:objectReferences>\n` +
        `    </objectSet>\n` +
        `  </adtcore:objectSets>\n` +
        `</aunit:runConfiguration>`);
}
/**
 * POST an ABAP Unit run to the synchronous /testruns endpoint and return the
 * raw response (body carries aunit:runResult). Runs every test class of each
 * referenced container class (the objectSet references the class object, so a
 * per-testclass filter is not applied — running the class runs its tests).
 */
async function startUnitTestRunSync(connection, tests, options) {
    if (!tests.length) {
        throw new Error('At least one test definition is required');
    }
    return (0, utils_1.makeAdtRequestWithTimeout)(connection, '/sap/bc/adt/abapunit/testruns', 'POST', 'default', buildUnitTestRunXml(tests, options), undefined, {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
    });
}
/** Coerce a fast-xml-parser node into an array (missing → []). */
function arr(x) {
    if (x == null)
        return [];
    return Array.isArray(x) ? x : [x];
}
function attr(node, name) {
    if (!node || typeof node !== 'object')
        return undefined;
    return node[`@_${name}`];
}
function parseAlerts(container) {
    return arr(container?.alerts?.alert).map((a) => {
        const details = arr(a?.details?.detail).map((d) => attr(d, 'text') ?? (typeof d === 'string' ? d : '') ?? '');
        return {
            kind: attr(a, 'kind'),
            severity: attr(a, 'severity'),
            title: a?.title ?? attr(a, 'title'),
            details: details.filter(Boolean),
        };
    });
}
/**
 * Parse an aunit:runResult response body into a compact summary. Namespace
 * prefixes are stripped so both adtcore:name and aunit:runResult resolve
 * regardless of prefix.
 */
function parseUnitTestRunResult(response) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
    });
    const data = typeof response.data === 'string'
        ? parser.parse(response.data)
        : response.data;
    const root = data?.runResult ?? data?.['aunit:runResult'] ?? data;
    const programs = arr(root?.program);
    const testClasses = [];
    for (const program of programs) {
        for (const tc of arr(program?.testClasses?.testClass)) {
            const methods = arr(tc?.testMethods?.testMethod).map((m) => {
                const alerts = parseAlerts(m);
                return {
                    name: attr(m, 'name'),
                    uri: attr(m, 'uri'),
                    execution_time: attr(m, 'executionTime'),
                    alerts,
                    passed: alerts.length === 0,
                };
            });
            testClasses.push({
                name: attr(tc, 'name'),
                uri: attr(tc, 'uri'),
                test_methods: methods,
                alerts: parseAlerts(tc),
            });
        }
    }
    const allMethods = testClasses.flatMap((c) => c.test_methods);
    const failed = allMethods.filter((m) => !m.passed).length;
    const alertsTotal = testClasses.reduce((n, c) => n + c.alerts.length, 0) +
        allMethods.reduce((n, m) => n + m.alerts.length, 0);
    return {
        test_classes: testClasses,
        total_methods: allMethods.length,
        passed_methods: allMethods.length - failed,
        failed_methods: failed,
        alerts_total: alertsTotal,
        success: failed === 0,
    };
}
/**
 * Best-effort run identifier. The synchronous /testruns POST returns results
 * inline (no async run), but some systems still emit a Location/ETag; fall back
 * to a stable synthetic id so the tool's run_id field is always populated.
 */
function extractUnitTestRunId(response) {
    const loc = response?.headers?.location ||
        response?.headers?.['content-location'];
    if (loc) {
        const m = loc.match(/\/testruns\/([^/?]+)/);
        if (m)
            return m[1];
    }
    return 'sync';
}
//# sourceMappingURL=unitTestRun.js.map