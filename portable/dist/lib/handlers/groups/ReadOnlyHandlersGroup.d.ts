import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerContext, HandlerEntry } from '../interfaces.js';
import { type IReadOnlyDedupStrategy } from './strategies/index.js';
/**
 * Handler group for all readonly (read-only) handlers.
 * Contains handlers that only read data without modifying the ABAP system.
 *
 * When other groups (HighLevel / LowLevel / Compact) are also exposed, some
 * readonly handlers semantically duplicate tools from those groups
 * (e.g. ReadFunctionModule vs GetFunctionModule). The group hides such
 * duplicates based on the injected override strategy and the set of tool
 * names contributed by the other groups.
 */
export declare class ReadOnlyHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    private readonly overridingToolNames;
    private readonly dedupStrategy;
    constructor(context: HandlerContext, overridingToolNames?: ReadonlySet<string>, dedupStrategy?: IReadOnlyDedupStrategy);
    /**
     * Gets all readonly handler entries, filtered by the dedup strategy.
     */
    getHandlers(): HandlerEntry[];
    private getAllEntries;
}
//# sourceMappingURL=ReadOnlyHandlersGroup.d.ts.map