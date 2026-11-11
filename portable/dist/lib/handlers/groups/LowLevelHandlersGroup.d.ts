import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerEntry } from '../interfaces.js';
/**
 * Handler group for all low-level handlers
 * Contains handlers that perform low-level operations (lock, unlock, activate, delete, check, validate, etc.)
 */
export declare class LowLevelHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    /**
     * Gets all low-level handler entries
     */
    getHandlers(): HandlerEntry[];
}
//# sourceMappingURL=LowLevelHandlersGroup.d.ts.map