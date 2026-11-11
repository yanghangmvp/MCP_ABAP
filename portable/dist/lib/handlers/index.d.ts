/**
 * Handlers module exports
 *
 * This module provides:
 * - Interfaces for handler groups and registries
 * - Base classes for creating handler groups
 * - Composite registry that supports Dependency Injection of handler groups
 * - Concrete handler group implementations
 * - HandlerExporter for easy integration with external servers
 */
export { BaseHandlerGroup } from './base/BaseHandlerGroup.js';
export * from './groups/index.js';
export type { HandlerExporterOptions } from './HandlerExporter.js';
export { createDefaultHandlerExporter, HandlerExporter, } from './HandlerExporter.js';
export * from './interfaces.js';
export { CompositeHandlersRegistry } from './registry/CompositeHandlersRegistry.js';
//# sourceMappingURL=index.d.ts.map