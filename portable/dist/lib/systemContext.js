"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSystemContext = resolveSystemContext;
exports.getSystemContext = getSystemContext;
exports.setSystemContext = setSystemContext;
exports.resetSystemContextCache = resetSystemContextCache;
const adt_clients_1 = require("@mcp-abap-adt/adt-clients");
const connectionEvents_1 = require("./connectionEvents");
// Process-global cache. For stdio (one session ⇒ one SAP system) this is
// sufficient and correct. For HTTP/SSE, BaseMcpServer.setConnectionContext[FromHeaders]
// calls resetSystemContextCache() at the start of every request so a PRIOR
// destination's context can't bleed in.
//
// KNOWN LIMITATION (HTTP/SSE, multi-destination, CONCURRENT requests only): this
// cache is process-global, and createAdtClient() (src/lib/clients.ts) reads it via
// getSystemContext(). The per-request reset stops stale carryover but not two
// in-flight requests for DIFFERENT destinations from overwriting each other's
// context between resolve and client-build. A full fix would carry the resolved
// context in a request-scoped AsyncLocalStorage instead of this global (see the
// CLAUDE.md note). NOT applicable to stdio (single destination, resolved once,
// no concurrency), which is the deployment this fork targets.
let cached;
/**
 * Detect whether the connected system is legacy (BASIS < 7.50).
 *
 * Uses SAP_SYSTEM_TYPE env var (default: cloud).
 * Auto-detection via /sap/bc/adt/core/discovery was removed because it is
 * unreliable — the result depends on shell environment, proxy config, and
 * whether the ICM port requires a pre-established session.
 *
 *   SAP_SYSTEM_TYPE=legacy  → legacy (BASIS < 7.50)
 *   SAP_SYSTEM_TYPE=onprem  → modern on-premise
 *   SAP_SYSTEM_TYPE=cloud   → modern cloud (default)
 */
function detectLegacy() {
    return process.env.SAP_SYSTEM_TYPE?.toLowerCase() === 'legacy';
}
async function resolveSystemContext(connection, overrides) {
    // Priority 1: explicit overrides (from HTTP headers)
    if (overrides && (overrides.masterSystem || overrides.responsible)) {
        cached = {
            masterSystem: overrides.masterSystem,
            responsible: overrides.responsible,
            masterLanguage: overrides.masterLanguage ?? process.env.SAP_LANGUAGE,
            isLegacy: cached?.isLegacy ?? detectLegacy(),
        };
        return cached;
    }
    if (cached)
        return cached;
    // Detect legacy from SAP_SYSTEM_TYPE (default: cloud → not legacy)
    const isLegacy = detectLegacy();
    // Priority 2: env vars (on-prem or explicitly configured)
    const masterSystem = process.env.SAP_MASTER_SYSTEM;
    const responsible = process.env.SAP_RESPONSIBLE || process.env.SAP_USERNAME;
    const masterLanguage = process.env.SAP_LANGUAGE;
    if (masterSystem || responsible || masterLanguage) {
        cached = { masterSystem, responsible, masterLanguage, isLegacy };
        return cached;
    }
    // Cloud: try getSystemInformation API
    try {
        const info = await (0, adt_clients_1.getSystemInformation)(connection);
        cached = {
            masterSystem: info?.systemID,
            responsible: info?.userName,
            client: info?.client,
            masterLanguage,
            isLegacy,
        };
    }
    catch {
        cached = { masterLanguage, isLegacy };
    }
    return cached;
}
function getSystemContext() {
    return cached || {};
}
/**
 * Set system context explicitly (safe, no HTTP requests).
 * Use this when system info is known upfront (e.g., from BTP destination metadata).
 */
function setSystemContext(context) {
    cached = {
        ...cached,
        ...context,
        isLegacy: context.isLegacy ?? cached?.isLegacy ?? detectLegacy(),
    };
}
function resetSystemContextCache() {
    cached = undefined;
}
(0, connectionEvents_1.registerConnectionResetHook)(resetSystemContextCache);
//# sourceMappingURL=systemContext.js.map