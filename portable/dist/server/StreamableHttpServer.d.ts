import type { Logger } from '@mcp-abap-adt/logger';
import type { AuthBrokerFactory } from '../lib/auth/index.js';
import type { TlsConfig } from '../lib/config/IServerConfig.js';
import type { IHandlersRegistry } from '../lib/handlers/interfaces.js';
import { BaseMcpServer } from './BaseMcpServer.js';
import type { IHttpApplication, RouteRegistrationOptions } from './IHttpApplication.js';
export interface StreamableHttpServerOptions {
    /**
     * Host to bind to (only used when no external app is provided)
     * @default "127.0.0.1"
     */
    host?: string;
    /**
     * Port to listen on (only used when no external app is provided)
     * @default 3000
     */
    port?: number;
    /**
     * Whether to return JSON responses (vs SSE streams)
     * @default true
     */
    enableJsonResponse?: boolean;
    /**
     * Default SAP destination to use if not specified in headers
     */
    defaultDestination?: string;
    /**
     * Path for the MCP endpoint
     * @default "/mcp/stream/http"
     */
    path?: string;
    /**
     * Logger instance
     */
    logger?: Logger;
    /**
     * Server version
     */
    version?: string;
    /**
     * External HTTP application to register routes on
     * When provided, start() will only register routes without creating a server
     * This enables integration with existing Express/CDS/CAP servers
     */
    app?: IHttpApplication;
    /**
     * TLS configuration for HTTPS support
     */
    tls?: TlsConfig;
    /**
     * Allow x-mcp-destination header to override default destination
     * @default false
     */
    allowDestinationHeader?: boolean;
    /** Accept x-sap-* direct-connection headers. Default true (back-compat). */
    allowDirectSapHeaders?: boolean;
}
/**
 * Minimal Streamable HTTP server implementation.
 * Creates new transport for each HTTP POST and forwards request to the MCP server.
 * Destination is taken from x-mcp-destination header or defaultDestination.
 *
 * Supports two modes:
 * 1. Standalone mode: Creates its own Express server (when no app option provided)
 * 2. Embedded mode: Registers routes on external app (when app option provided)
 */
export declare class StreamableHttpServer extends BaseMcpServer {
    private readonly handlersRegistry;
    private readonly authBrokerFactory;
    private readonly host;
    private readonly port;
    private readonly enableJsonResponse;
    private readonly defaultDestination?;
    private readonly path;
    private readonly externalApp?;
    private readonly version;
    private standaloneServer?;
    private readonly tls?;
    private readonly allowDestinationHeader;
    private readonly allowDirectSapHeaders;
    /** Per-destination lock to serialize token acquisition (prevents concurrent OAuth flows) */
    private readonly authLocks;
    constructor(handlersRegistry: IHandlersRegistry, authBrokerFactory: AuthBrokerFactory, opts?: StreamableHttpServerOptions);
    /**
     * Creates the request handler function
     * Can be used to register on external app or internal Express
     */
    private createRequestHandler;
    /**
     * Register routes on an external HTTP application
     * Use this when integrating with existing Express/CDS/CAP server
     *
     * @param app - External HTTP application (Express, CDS, etc.)
     * @param options - Route registration options
     */
    registerRoutes(app: IHttpApplication, options?: RouteRegistrationOptions): void;
    /**
     * Get the configured endpoint path
     */
    getPath(): string;
    /**
     * Start the server
     *
     * In standalone mode (no external app): Creates Express server and starts listening
     * In embedded mode (external app provided): Only registers routes on external app
     */
    start(): Promise<void>;
    /**
     * Check if request has SAP connection headers
     */
    private hasSapConnectionHeaders;
    private createPerRequestServer;
}
//# sourceMappingURL=StreamableHttpServer.d.ts.map