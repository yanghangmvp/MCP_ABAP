import type { Logger } from '@mcp-abap-adt/logger';
import type { AuthBrokerFactory } from '../lib/auth/index.js';
import type { TlsConfig } from '../lib/config/IServerConfig.js';
import type { IHandlersRegistry } from '../lib/handlers/interfaces.js';
import type { IHttpApplication, RouteRegistrationOptions } from './IHttpApplication.js';
export interface SseServerOptions {
    /**
     * Host to bind to (only used when no external app is provided)
     * @default "127.0.0.1"
     */
    host?: string;
    /**
     * Port to listen on (only used when no external app is provided)
     * @default 3001
     */
    port?: number;
    /**
     * Path for SSE GET endpoint
     * @default "/sse"
     */
    ssePath?: string;
    /**
     * Path for POST messages endpoint
     * @default "/messages"
     */
    postPath?: string;
    /**
     * Default SAP destination to use if not specified in headers
     */
    defaultDestination?: string;
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
 * Minimal SSE server: creates a new BaseMcpServer per GET connection, routes POST by sessionId.
 *
 * Supports two modes:
 * 1. Standalone mode: Creates its own Express server (when no app option provided)
 * 2. Embedded mode: Registers routes on external app (when app option provided)
 */
export declare class SseServer {
    private readonly handlersRegistry;
    private readonly authBrokerFactory;
    private readonly host;
    private readonly port;
    private readonly ssePath;
    private readonly postPath;
    private readonly defaultDestination?;
    private readonly sessions;
    private readonly logger;
    private readonly version;
    private readonly externalApp?;
    private standaloneServer?;
    private readonly tls?;
    private readonly allowDestinationHeader;
    private readonly allowDirectSapHeaders;
    constructor(handlersRegistry: IHandlersRegistry, authBrokerFactory: AuthBrokerFactory, opts?: SseServerOptions);
    /**
     * Register routes on an external HTTP application
     * Use this when integrating with existing Express/CDS/CAP server
     *
     * @param app - External HTTP application (Express, CDS, etc.)
     * @param options - Route registration options
     */
    registerRoutes(app: IHttpApplication, options?: RouteRegistrationOptions): void;
    /**
     * Get the configured SSE endpoint path
     */
    getSsePath(): string;
    /**
     * Get the configured POST endpoint path
     */
    getPostPath(): string;
    /**
     * Start the server
     *
     * In standalone mode (no external app): Creates Express server and starts listening
     * In embedded mode (external app provided): Only registers routes on external app
     */
    start(): Promise<void>;
    private handleGet;
    private handlePost;
    /**
     * Check if request has SAP connection headers
     */
    private hasSapConnectionHeaders;
}
//# sourceMappingURL=SseServer.d.ts.map