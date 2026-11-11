"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoDedupStrategy = void 0;
/**
 * Null strategy — never excludes anything. Useful when the caller wants to
 * expose the readonly group as-is regardless of other groups present.
 */
class NoDedupStrategy {
    shouldExclude(_entry, _overridingToolNames) {
        return false;
    }
}
exports.NoDedupStrategy = NoDedupStrategy;
//# sourceMappingURL=NoDedupStrategy.js.map