"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadVsGetDedupStrategy = void 0;
/**
 * Excludes a readonly `Read<X>` handler when a corresponding `Get<X>` handler
 * is contributed by another group (HighLevel) or when the HighLevel/LowLevel
 * groups otherwise provide a semantic replacement.
 *
 * Standalone `Get*` / `List*` readonly handlers (e.g. GetEnhancements,
 * ListTransports) are never excluded — they have no pair in other groups.
 */
class ReadVsGetDedupStrategy {
    shouldExclude(entry, overridingToolNames) {
        const name = entry.toolDefinition.name;
        if (!name.startsWith('Read'))
            return false;
        const getName = 'Get' + name.slice('Read'.length);
        return overridingToolNames.has(getName);
    }
}
exports.ReadVsGetDedupStrategy = ReadVsGetDedupStrategy;
//# sourceMappingURL=ReadVsGetDedupStrategy.js.map