"use strict";
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
exports.getServerBuildInfo = getServerBuildInfo;
exports.describeServerBuild = describeServerBuild;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function readPackageVersion() {
    // Walk up from this file: works for both src/lib (ts-jest) and dist/lib.
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(dir, 'package.json');
        try {
            if (fs.existsSync(candidate)) {
                const parsed = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
                if (typeof parsed?.version === 'string')
                    return parsed.version;
            }
        }
        catch {
            // fall through to the next parent
        }
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return 'unknown';
}
function readBuildTimestamp() {
    try {
        return fs.statSync(__filename).mtime.toISOString();
    }
    catch {
        return undefined;
    }
}
/** Frozen at first import = process start. See the note above on why. */
const BUILD = {
    server_version: readPackageVersion(),
    build_timestamp: readBuildTimestamp(),
    started_at: new Date().toISOString(),
    pid: process.pid,
};
function getServerBuildInfo() {
    return { ...BUILD };
}
/**
 * One line for an error envelope: short enough to add to every failure without
 * crowding out the failure itself.
 */
function describeServerBuild() {
    const built = BUILD.build_timestamp ? `, built ${BUILD.build_timestamp}` : '';
    return `mcp-abap-adt ${BUILD.server_version}${built}, pid ${BUILD.pid}`;
}
//# sourceMappingURL=serverVersion.js.map