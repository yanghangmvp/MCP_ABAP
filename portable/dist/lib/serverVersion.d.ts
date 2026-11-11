/**
 * Which build is answering.
 *
 * WHY THIS EXISTS (field report round 7, F-11 — their number one item). Nothing in any
 * tool response said which server build produced it, and that cost both sides
 * twice, on the record:
 *
 *   - round 3's K-4: a defect was reported from evidence that predated the fix
 *     for it, and had to be retracted a round later;
 *   - rounds 4 and 5: their running process was a pre-round-3 build while the
 *     `dist/` on disk was current, so five verifications were silently invalid
 *     until someone noticed a parameter name had not changed.
 *
 * Both failures are the same shape: a measurement taken against a build neither
 * side could name. `ls -l dist/index.js` is not an answer — the file on disk is
 * not the process in memory, and the gap between them is exactly where those two
 * failures lived.
 *
 * SO THE TIMESTAMP IS CAPTURED AT MODULE LOAD, not read on demand. A rebuild
 * after the server started changes the file's mtime while the running process
 * keeps serving the old code; reading the mtime per call would report the new
 * build and reproduce the very confusion this is meant to end. What is frozen
 * here is the build that was actually loaded.
 */
export interface ServerBuildInfo {
    /** `version` from package.json. */
    server_version: string;
    /** ISO mtime of the loaded module file — the build that is running. */
    build_timestamp?: string;
    /** When this process started. */
    started_at: string;
    /** OS process id, so two servers on one host can be told apart. */
    pid: number;
}
export declare function getServerBuildInfo(): ServerBuildInfo;
/**
 * One line for an error envelope: short enough to add to every failure without
 * crowding out the failure itself.
 */
export declare function describeServerBuild(): string;
//# sourceMappingURL=serverVersion.d.ts.map