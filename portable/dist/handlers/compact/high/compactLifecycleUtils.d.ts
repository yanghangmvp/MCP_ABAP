import type { CompactObjectType } from './compactObjectTypes';
export type LowObjectType = 'class' | 'program' | 'interface' | 'function_group' | 'function_module' | 'table' | 'structure' | 'view' | 'domain' | 'data_element' | 'package' | 'behavior_definition' | 'behavior_implementation' | 'metadata_extension';
export declare function toLowObjectType(objectType: CompactObjectType): LowObjectType | null;
//# sourceMappingURL=compactLifecycleUtils.d.ts.map