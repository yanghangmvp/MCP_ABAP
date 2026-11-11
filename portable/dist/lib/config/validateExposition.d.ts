import type { HandlerSet } from './IServerConfig.js';
/**
 * Validates an exposition array and throws on disallowed combinations.
 *
 * Rules:
 * - `compact` is exposed only by itself. It cannot be combined with any other set.
 * - `high` and `low` are mutually exclusive.
 */
export declare function validateExposition(exposition: readonly HandlerSet[]): void;
//# sourceMappingURL=validateExposition.d.ts.map