"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePackagePatterns = resolvePackagePatterns;
exports.createPackagePatternResolver = createPackagePatternResolver;
const clients_1 = require("../clients");
const WILDCARD_RE = /[*+]/;
function isPattern(entry) {
    return WILDCARD_RE.test(entry);
}
async function resolvePackagePatterns(deps, entries) {
    const exact = [];
    const resolved = [];
    for (const entry of entries) {
        if (isPattern(entry)) {
            const names = await deps.searchObjects({
                query: entry,
                objectType: 'DEVC',
                maxResults: 1000,
            });
            resolved.push(...names);
        }
        else {
            exact.push(entry);
        }
    }
    const seen = new Set();
    const out = [];
    for (const name of [...exact, ...resolved]) {
        const key = name.toUpperCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(name);
    }
    return out;
}
function createPackagePatternResolver(ctx) {
    const client = (0, clients_1.createAdtClient)(ctx.connection, ctx.logger);
    const utils = client.getUtils();
    return async ({ query, objectType, maxResults }) => {
        const response = await utils.searchObjects({
            query,
            objectType,
            maxResults,
        });
        const status = response?.status;
        if (status && status !== 200) {
            throw new Error(`ADT request failed (status ${status})`);
        }
        const xml = typeof response?.data === 'string'
            ? response.data
            : String(response?.data ?? '');
        const names = [];
        for (const m of xml.matchAll(/<adtcore:objectReference\s+([^>]*)\/>/g)) {
            const attrs = m[1];
            const name = attrs.match(/adtcore:name="([^"]*)"/)?.[1];
            if (name)
                names.push(name);
        }
        return names;
    };
}
//# sourceMappingURL=packageResolver.js.map