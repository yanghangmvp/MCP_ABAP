import { BaseHandlerGroup } from '../base/BaseHandlerGroup.js';
import type { HandlerEntry } from '../interfaces.js';
/**
 * Handler group for compact facade handlers.
 * Provides unified CRUD router tools by object_type.
 */
export declare class CompactHandlersGroup extends BaseHandlerGroup {
    protected groupName: string;
    getHandlers(): HandlerEntry[];
}
//# sourceMappingURL=CompactHandlersGroup.d.ts.map