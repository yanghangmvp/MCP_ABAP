import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerEntry } from '../interfaces.js';
/**
 * Handler group for all high-level handlers
 * Contains handlers that perform CRUD operations using high-level APIs
 */
export declare class HighLevelHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    /**
     * Gets all high-level handler entries
     */
    getHandlers(): HandlerEntry[];
}
//# sourceMappingURL=HighLevelHandlersGroup.d.ts.map