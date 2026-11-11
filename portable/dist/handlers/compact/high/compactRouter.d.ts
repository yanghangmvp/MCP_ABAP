import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type CompactCrudOperation } from './compactMatrix';
import type { CompactObjectType } from './compactObjectTypes';
type CompactHandler = (context: HandlerContext, args: Record<string, unknown>) => Promise<unknown>;
type CompactRouterMap = Record<CompactObjectType, Partial<Record<CompactCrudOperation, CompactHandler>>>;
export declare const compactRouterMap: CompactRouterMap;
export declare function routeCompactOperation(context: HandlerContext, operation: CompactCrudOperation, args: {
    object_type: CompactObjectType;
} & Record<string, unknown>): Promise<unknown>;
export {};
//# sourceMappingURL=compactRouter.d.ts.map