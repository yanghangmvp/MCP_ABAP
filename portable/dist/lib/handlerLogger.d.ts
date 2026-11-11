import type { Logger } from '@mcp-abap-adt/logger';
/**
 * Create a prefixed logger for handlers.
 * Honors AUTH_LOG_LEVEL from @mcp-abap-adt/logger; set to "error"/"warn"/"info"/"debug".
 * Use HANDLER_LOG_SILENT=true to force no-op logger for handlers.
 */
export declare function getHandlerLogger(category: string, baseLogger?: Logger): Logger;
export declare const noopLogger: Logger;
//# sourceMappingURL=handlerLogger.d.ts.map