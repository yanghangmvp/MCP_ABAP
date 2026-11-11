/**
 * StdioLogger - minimal logger for stdio transport
 *
 * Only writes errors to stderr, all other log levels are no-ops
 * This is required because MCP protocol over stdio requires only JSON-RPC messages on stdout
 */
/**
 * Minimal logger for stdio transport
 * Only errors are written to stderr, all other methods are no-ops
 */
export declare class StdioLogger {
    info(_message: string, ..._args: any[]): void;
    error(message: string, ...args: any[]): void;
    warn(_message: string, ..._args: any[]): void;
    debug(_message: string, ..._args: any[]): void;
}
//# sourceMappingURL=StdioLogger.d.ts.map