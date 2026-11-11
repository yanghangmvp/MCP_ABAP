import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerEntry } from '../interfaces.js';
/**
 * Handler group for all system-related handlers
 * Contains handlers for system information, analysis, and metadata operations
 */
export declare class SystemHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    /**
     * Gets all system handler entries
     */
    getHandlers(): HandlerEntry[];
}
//# sourceMappingURL=SystemHandlersGroup.d.ts.map