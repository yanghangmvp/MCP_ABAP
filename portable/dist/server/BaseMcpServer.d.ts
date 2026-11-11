import type { AuthBroker } from '@mcp-abap-adt/auth-broker';
import { type AbapConnection } from '@mcp-abap-adt/connection';
import type { Logger } from '@mcp-abap-adt/logger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IHandlersRegistry, SapEnvironment } from '../lib/handlers/interfaces.js';
import type { ConnectionContext } from './ConnectionContext.js';
/**
 * Base MCP Server class that extends SDK McpServer
 * Manages connection context and provides connection injection for handlers
 */
export declare abstract class BaseMcpServer extends McpServer {
    /**
     * Logger used for handler context
     */
    protected readonly logger: Logger;
    /**
     * Connection context (set per request for SSE/HTTP, once for stdio)
     */
    protected connectionContext: ConnectionContext | null;
    /**
     * Auth broker for token and service key management
     */
    protected authBroker?: AuthBroker;
    /**
     * Cached connection for stdio mode (created once, reused for all requests)
     */
    private cachedConnection;
    /**
     * Per-instance SAP system type. Overrides process.env.SAP_SYSTEM_TYPE
     * for `available_in` filtering at handler registration time.
     */
    protected readonly systemType?: SapEnvironment;
    constructor(options: {
        name: string;
        version?: string;
        logger?: Logger;
        systemType?: SapEnvironment;
    });
    /**
     * Sets connection context using auth broker
     * For stdio: called once on startup
     * For SSE/HTTP: called per-request
     */
    protected setConnectionContext(destination: string, authBroker: AuthBroker): Promise<void>;
    /**
     * Sets connection context from HTTP headers (direct SAP connection, no broker)
     * Used when x-sap-url + auth headers are provided
     */
    protected setConnectionContextFromHeaders(headers: Record<string, string | string[] | undefined>): void;
    /**
     * Gets current connection context
     */
    protected getConnectionContext(): ConnectionContext | null;
    /**
     * Gets ABAP connection from connection context
     * Creates connection using connectionParams from context
     * Automatically refreshes token via AuthBroker if available (inside makeAdtRequest)
     * For stdio mode: caches connection and reuses it for all requests (like v1)
     * For SSE/HTTP: creates new connection per request
     */
    protected getConnection(): Promise<AbapConnection>;
    /**
     * Registers handlers from registry
     * Wraps handlers to inject connection as first parameter
     *
     * Handler signature: (connection: AbapConnection, args: any) => Promise<any>
     * Registered as: (args: any) => handler(getConnection(), args)
     *
     * This ensures connection is injected but NOT exposed in MCP tool signature
     */
    protected registerHandlers(handlersRegistry: IHandlersRegistry): void;
}
//# sourceMappingURL=BaseMcpServer.d.ts.map