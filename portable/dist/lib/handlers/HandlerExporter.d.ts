import type { Logger } from '@mcp-abap-adt/logger';
import type { HandlerEntry, IHandlersRegistry } from './interfaces.js';
/**
 * Options for creating handler exporter
 */
export interface HandlerExporterOptions {
    /**
     * Logger instance for handler context
     * @default defaultLogger
     */
    logger?: Logger;
    /**
     * Include readonly handlers (getProgram, getClass, etc.)
     * @default true
     */
    includeReadOnly?: boolean;
    /**
     * Include high-level handlers
     * @default true
     */
    includeHighLevel?: boolean;
    /**
     * Include low-level handlers
     * @default true
     */
    includeLowLevel?: boolean;
    /**
     * Include compact facade handlers
     * @default false
     */
    includeCompact?: boolean;
    /**
     * Include system handlers
     * @default true
     */
    includeSystem?: boolean;
    /**
     * Include search handlers
     * @default true
     */
    includeSearch?: boolean;
}
/**
 * Handler Exporter - factory for creating handlers registry
 *
 * This class provides a way to create handlers registry with configurable
 * exposition levels. Use with EmbeddableMcpServer for external integration.
 *
 * Usage:
 * ```typescript
 * import { HandlerExporter, EmbeddableMcpServer } from '@mcp-abap-adt/core';
 *
 * // Create exporter with specific handlers
 * const exporter = new HandlerExporter({
 *   includeReadOnly: true,
 *   includeHighLevel: true,
 *   includeLowLevel: false,
 * });
 *
 * // Use with EmbeddableMcpServer
 * const server = new EmbeddableMcpServer({
 *   connection: myConnection,
 *   handlersRegistry: exporter.createRegistry(),
 * });
 * ```
 */
export declare class HandlerExporter {
    private readonly logger;
    private readonly handlerGroups;
    constructor(options?: HandlerExporterOptions);
    /**
     * Get all handler entries
     * Useful for inspection or custom registration logic
     */
    getHandlerEntries(): HandlerEntry[];
    /**
     * Get list of tool names
     */
    getToolNames(): string[];
    /**
     * Create handlers registry for use with EmbeddableMcpServer or BaseMcpServer
     */
    createRegistry(): IHandlersRegistry;
}
/**
 * Create default handler exporter with all handler groups
 */
export declare function createDefaultHandlerExporter(logger?: Logger): HandlerExporter;
//# sourceMappingURL=HandlerExporter.d.ts.map