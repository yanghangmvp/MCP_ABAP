import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerEntry } from '../interfaces.js';
/**
 * Handler group for all search-related handlers
 * Contains handlers for searching and listing objects in the ABAP system
 */
export declare class SearchHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    /**
     * Gets all search handler entries
     */
    getHandlers(): HandlerEntry[];
}
//# sourceMappingURL=SearchHandlersGroup.d.ts.map