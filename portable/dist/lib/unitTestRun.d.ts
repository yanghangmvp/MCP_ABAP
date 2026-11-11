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
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { type AxiosResponse } from './utils';
export interface UnitTestDefinition {
    containerClass: string;
    testClass?: string;
}
export interface UnitTestRunOptions {
    riskLevel?: {
        harmless?: boolean;
        dangerous?: boolean;
        critical?: boolean;
    };
    duration?: {
        short?: boolean;
        medium?: boolean;
        long?: boolean;
    };
}
export interface UnitTestAlert {
    kind?: string;
    severity?: string;
    title?: string;
    details: string[];
}
export interface UnitTestMethod {
    name?: string;
    uri?: string;
    execution_time?: string;
    alerts: UnitTestAlert[];
    passed: boolean;
}
export interface UnitTestClassResult {
    name?: string;
    uri?: string;
    test_methods: UnitTestMethod[];
    alerts: UnitTestAlert[];
}
export interface UnitTestRunSummary {
    test_classes: UnitTestClassResult[];
    total_methods: number;
    passed_methods: number;
    failed_methods: number;
    alerts_total: number;
    success: boolean;
}
/**
 * Build the aunit:runConfiguration body for the /testruns POST. Exported for
 * testing — the <options> block (esp. <testDeterminationStrategy>) is what makes
 * SAP actually determine + run tests; omit it and the run returns an empty
 * result with HTTP 200.
 */
export declare function buildUnitTestRunXml(tests: UnitTestDefinition[], options?: UnitTestRunOptions): string;
/**
 * POST an ABAP Unit run to the synchronous /testruns endpoint and return the
 * raw response (body carries aunit:runResult). Runs every test class of each
 * referenced container class (the objectSet references the class object, so a
 * per-testclass filter is not applied — running the class runs its tests).
 */
export declare function startUnitTestRunSync(connection: IAbapConnection, tests: UnitTestDefinition[], options?: UnitTestRunOptions): Promise<AxiosResponse>;
/**
 * Parse an aunit:runResult response body into a compact summary. Namespace
 * prefixes are stripped so both adtcore:name and aunit:runResult resolve
 * regardless of prefix.
 */
export declare function parseUnitTestRunResult(response: AxiosResponse): UnitTestRunSummary;
/**
 * Best-effort run identifier. The synchronous /testruns POST returns results
 * inline (no async run), but some systems still emit a Location/ETag; fall back
 * to a stable synthetic id so the tool's run_id field is always populated.
 */
export declare function extractUnitTestRunId(response: AxiosResponse): string;
//# sourceMappingURL=unitTestRun.d.ts.map