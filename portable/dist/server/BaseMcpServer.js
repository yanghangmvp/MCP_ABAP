"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMcpServer = void 0;
const connection_1 = require("@mcp-abap-adt/connection");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const CompositeHandlersRegistry_js_1 = require("../lib/handlers/registry/CompositeHandlersRegistry.js");
const schemaUtils_js_1 = require("../lib/handlers/utils/schemaUtils.js");
const systemContext_js_1 = require("../lib/systemContext.js");
const utils_js_1 = require("../lib/utils.js");
/**
 * Base MCP Server class that extends SDK McpServer
 * Manages connection context and provides connection injection for handlers
 */
class BaseMcpServer extends mcp_js_1.McpServer {
    /**
     * Logger used for handler context
     */
    logger;
    /**
     * Connection context (set per request for SSE/HTTP, once for stdio)
     */
    connectionContext = null;
    /**
     * Auth broker for token and service key management
     */
    authBroker;
    /**
     * Cached connection for stdio mode (created once, reused for all requests)
     */
    cachedConnection = null;
    /**
     * Per-instance SAP system type. Overrides process.env.SAP_SYSTEM_TYPE
     * for `available_in` filtering at handler registration time.
     */
    systemType;
    constructor(options) {
        super({ name: options.name, version: options.version ?? '1.0.0' });
        this.logger = options.logger ?? getDefaultLogger();
        this.systemType = options.systemType;
    }
    /**
     * Sets connection context using auth broker
     * For stdio: called once on startup
     * For SSE/HTTP: called per-request
     */
    async setConnectionContext(destination, authBroker) {
        // The system-context cache is process-global. For HTTP/SSE this method runs
        // per request and each request may target a DIFFERENT destination, so drop
        // any prior destination's masterSystem/responsible/client before resolving
        // this one — otherwise destination A's context bleeds into destination B.
        // (stdio calls this once at startup, so the reset is a harmless no-op.)
        (0, systemContext_js_1.resetSystemContextCache)();
        this.authBroker = authBroker;
        // Register broker so destination-aware connections can refresh tokens
        (0, utils_js_1.registerAuthBroker)(destination, authBroker);
        this.logger.debug(`[BaseMcpServer] Getting connection config for destination: ${destination}`);
        // Get connection parameters from broker
        // AuthBroker.getConnectionConfig() automatically checks session store first, then service key store
        const connectionConfig = await authBroker.getConnectionConfig(destination);
        this.logger.debug(`[BaseMcpServer] Connection config result:`, {
            found: !!connectionConfig,
            destination,
            hasServiceUrl: !!connectionConfig?.serviceUrl,
        });
        if (!connectionConfig) {
            throw new Error(`Connection config not found for destination: ${destination}`);
        }
        // Try to get fresh token from broker
        // If broker can't refresh (no UAA credentials), use existing token from connectionConfig
        let freshToken;
        let tokenError;
        try {
            freshToken = await authBroker.getToken(destination);
        }
        catch (error) {
            // Broker can't provide/refresh token (e.g., no UAA credentials for .env-only setup)
            // Use existing token from connectionConfig - user is responsible for token management
            this.logger.debug(`Broker can't refresh token, using existing token from session: ${error instanceof Error ? error.message : String(error)}`);
            tokenError = error;
            freshToken = connectionConfig.authorizationToken;
        }
        const tokenToUse = freshToken || connectionConfig.authorizationToken || '';
        // Determine auth type from connection config
        const authType = connectionConfig.authType ||
            (connectionConfig.username && connectionConfig.password
                ? 'basic'
                : 'jwt');
        // Only basic/jwt are wired into the connection path below. SAP_AUTH_TYPE
        // also parses certificate/kerberos/saml, but they are NOT implemented here
        // — fail loudly instead of silently falling through to the jwt branch with
        // an empty token (which surfaces as a confusing downstream error).
        if (authType !== 'basic' && authType !== 'jwt') {
            throw new Error(`Auth type "${authType}" is not supported by this server; only 'basic' ` +
                `and 'jwt' are implemented. Set SAP_AUTH_TYPE=basic or jwt (or provide ` +
                `SAP_JWT_TOKEN for jwt).`);
        }
        if (authType === 'jwt' && !tokenToUse) {
            const reason = tokenError instanceof Error ? tokenError.message : String(tokenError);
            throw new Error(`JWT token is missing for destination "${destination}". ${reason ? `Token provider error: ${reason}. ` : ''}Provide a valid session token (or refresh token) for this destination, or use --env-path with SAP_JWT_TOKEN.`);
        }
        // Connection type from env (http or rfc) — not stored in broker/session
        const connectionType = process.env.SAP_CONNECTION_TYPE?.trim().toLowerCase() === 'rfc'
            ? 'rfc'
            : undefined;
        // Resolve masterSystem/responsible early so handlers get proper context
        // Create a temporary connection to call getSystemInformation
        let masterSystem;
        let responsible;
        try {
            const tempParams = authType === 'jwt'
                ? {
                    url: connectionConfig.serviceUrl || '',
                    authType: 'jwt',
                    jwtToken: tokenToUse,
                    client: connectionConfig.sapClient || '',
                }
                : {
                    url: connectionConfig.serviceUrl || '',
                    authType: 'basic',
                    username: connectionConfig.username || '',
                    password: connectionConfig.password || '',
                    client: connectionConfig.sapClient || '',
                };
            const tempConn = (0, connection_1.createAbapConnection)(tempParams);
            const systemCtx = await (0, systemContext_js_1.resolveSystemContext)(tempConn);
            masterSystem = systemCtx.masterSystem;
            responsible = systemCtx.responsible;
            // Use client from system info as fallback when not in .env (cloud systems)
            if (!connectionConfig.sapClient && systemCtx.client) {
                connectionConfig.sapClient = systemCtx.client;
            }
            this.logger.debug(`[BaseMcpServer] Resolved systemContext: masterSystem=${masterSystem}, responsible=${responsible}, client=${systemCtx.client || '(none)'}`);
        }
        catch (error) {
            this.logger.debug(`[BaseMcpServer] Could not resolve systemContext: ${error instanceof Error ? error.message : String(error)}`);
        }
        this.connectionContext = {
            sessionId: destination,
            connectionParams: authType === 'basic'
                ? {
                    url: connectionConfig.serviceUrl || '',
                    authType: 'basic',
                    username: connectionConfig.username || '',
                    password: connectionConfig.password || '',
                    client: connectionConfig.sapClient || '',
                    ...(connectionType && { connectionType }),
                }
                : {
                    url: connectionConfig.serviceUrl || '',
                    authType: 'jwt',
                    jwtToken: tokenToUse, // broker keeps it fresh
                    client: connectionConfig.sapClient || '',
                },
            metadata: {
                destination,
                masterSystem,
                responsible,
            },
        };
    }
    /**
     * Sets connection context from HTTP headers (direct SAP connection, no broker)
     * Used when x-sap-url + auth headers are provided
     */
    setConnectionContextFromHeaders(headers) {
        // Per-request: clear any previous request's cached system context (see
        // setConnectionContext) so x-sap-* headers from request A can't bleed into B.
        (0, systemContext_js_1.resetSystemContextCache)();
        const getHeader = (name) => {
            const value = headers[name] ?? headers[name.toUpperCase()];
            return Array.isArray(value) ? value[0] : value;
        };
        const url = getHeader('x-sap-url');
        const jwtToken = getHeader('x-sap-jwt-token');
        const username = getHeader('x-sap-login');
        const password = getHeader('x-sap-password');
        const client = getHeader('x-sap-client') || '';
        const masterSystem = getHeader('x-sap-master-system');
        const responsible = getHeader('x-sap-responsible');
        if (!url) {
            throw new Error('x-sap-url header is required for direct SAP connection');
        }
        const metadata = {};
        if (masterSystem)
            metadata.masterSystem = masterSystem;
        if (responsible)
            metadata.responsible = responsible;
        if (jwtToken) {
            // JWT auth
            this.connectionContext = {
                sessionId: 'direct-jwt',
                connectionParams: {
                    url,
                    authType: 'jwt',
                    jwtToken,
                    client,
                },
                metadata,
            };
        }
        else if (username && password) {
            // Basic auth
            this.connectionContext = {
                sessionId: 'direct-basic',
                connectionParams: {
                    url,
                    authType: 'basic',
                    username,
                    password,
                    client,
                },
                metadata,
            };
        }
        else {
            throw new Error('Either x-sap-jwt-token or x-sap-login+x-sap-password headers are required');
        }
    }
    /**
     * Gets current connection context
     */
    getConnectionContext() {
        return this.connectionContext;
    }
    /**
     * Gets ABAP connection from connection context
     * Creates connection using connectionParams from context
     * Automatically refreshes token via AuthBroker if available (inside makeAdtRequest)
     * For stdio mode: caches connection and reuses it for all requests (like v1)
     * For SSE/HTTP: creates new connection per request
     */
    async getConnection() {
        if (!this.connectionContext?.connectionParams) {
            throw new Error('Connection context not set. Call setConnectionContext() first.');
        }
        const destination = this.connectionContext.metadata?.destination;
        const sessionId = this.connectionContext.sessionId;
        // For stdio mode: cache connection and reuse it (like v1)
        // This prevents creating new connection on each request, which would trigger browser auth
        // Check if we have cached connection with same sessionId (stdio uses destination as sessionId)
        if (destination && this.cachedConnection && sessionId === destination) {
            // Reuse cached connection for stdio mode
            return this.cachedConnection;
        }
        // Create tokenRefresher from AuthBroker for automatic JWT token refresh on 401
        let tokenRefresher;
        if (destination &&
            this.authBroker &&
            this.connectionContext.connectionParams.authType === 'jwt' &&
            typeof this.authBroker.createTokenRefresher === 'function') {
            tokenRefresher = this.authBroker.createTokenRefresher(destination);
        }
        const connection = (0, connection_1.createAbapConnection)(this.connectionContext.connectionParams, undefined, undefined, tokenRefresher);
        // Establish session (CSRF token + cookies) before first request.
        // RFC needs this for the stateful session; HTTP needs it because some SAP systems
        // reject the very first request (403) when no session cookie is present.
        await connection.connect();
        // Cache connection for stdio mode (when sessionId === destination, it's stdio)
        // SSE/HTTP modes use different sessionId per request, so caching won't interfere
        if (destination && sessionId === destination) {
            this.cachedConnection = connection;
        }
        return connection;
    }
    /**
     * Registers handlers from registry
     * Wraps handlers to inject connection as first parameter
     *
     * Handler signature: (connection: AbapConnection, args: any) => Promise<any>
     * Registered as: (args: any) => handler(getConnection(), args)
     *
     * This ensures connection is injected but NOT exposed in MCP tool signature
     */
    registerHandlers(handlersRegistry) {
        // Get handler groups from registry
        if (handlersRegistry instanceof CompositeHandlersRegistry_js_1.CompositeHandlersRegistry) {
            const groups = handlersRegistry.getHandlerGroups();
            for (const group of groups) {
                const handlers = group.getHandlers();
                for (const entry of handlers) {
                    const wrappedHandler = async (args) => {
                        // Get connection from context (this.connectionContext)
                        // Token will be automatically refreshed via AuthBroker if needed
                        const context = {
                            connection: await this.getConnection(),
                            logger: this.logger,
                        };
                        // If handler expects context+args (preferred), pass both.
                        // Otherwise, update group context and call with args only for backward compatibility.
                        // NOTE: Always await the handler result to ensure we get the resolved value for normalization
                        let handlerPromise;
                        if (entry.handler.length >= 2) {
                            handlerPromise = entry.handler(context, args);
                        }
                        else {
                            try {
                                const contextAwareGroup = group;
                                if (typeof contextAwareGroup.setContext === 'function') {
                                    contextAwareGroup.setContext(context);
                                }
                                else {
                                    contextAwareGroup.context = context;
                                }
                            }
                            catch {
                                // ignore if group doesn't expose context setter
                            }
                            handlerPromise = entry.handler(args);
                        }
                        const result = await handlerPromise;
                        if (result?.isError) {
                            const { ErrorCode, McpError } = await import('@modelcontextprotocol/sdk/types.js');
                            const errorText = (result?.content || [])
                                .map((item) => {
                                if (item?.type === 'json' && item.json !== undefined) {
                                    return JSON.stringify(item.json);
                                }
                                return item?.text !== undefined
                                    ? String(item.text)
                                    : String(item);
                            })
                                .join('\n') || 'Unknown error';
                            throw new McpError(ErrorCode.InternalError, errorText);
                        }
                        // Normalize content: SDK expects text/image/audio/resource, convert custom json to text
                        const content = (result?.content || []).map((item) => {
                            if (item?.type === 'json' && item.json !== undefined) {
                                return {
                                    type: 'text',
                                    text: JSON.stringify(item.json),
                                };
                            }
                            // Ensure all items have proper text type structure
                            return {
                                type: 'text',
                                text: item?.text !== undefined
                                    ? String(item.text)
                                    : String(item || ''),
                            };
                        });
                        return { content };
                    };
                    // Convert JSON Schema to Zod if needed, otherwise pass as-is
                    const zodSchema = entry.toolDefinition.inputSchema &&
                        typeof entry.toolDefinition.inputSchema === 'object' &&
                        entry.toolDefinition.inputSchema.type === 'object' &&
                        entry.toolDefinition.inputSchema.properties
                        ? (0, schemaUtils_js_1.jsonSchemaToZod)(entry.toolDefinition.inputSchema)
                        : entry.toolDefinition.inputSchema;
                    // Skip tools not available in the current SAP environment
                    const availableIn = entry.toolDefinition.available_in;
                    if (availableIn && availableIn.length > 0) {
                        const resolvedType = this.systemType ?? process.env.SAP_SYSTEM_TYPE?.toLowerCase();
                        const currentEnv = resolvedType === 'legacy'
                            ? 'legacy'
                            : resolvedType === 'onprem'
                                ? 'onprem'
                                : 'cloud';
                        if (!availableIn.includes(currentEnv)) {
                            this.logger.debug(`[BaseMcpServer] Skipping tool ${entry.toolDefinition.name}: available_in=${JSON.stringify(availableIn)}, currentEnv=${currentEnv}, source=${this.systemType ? 'option' : 'env'}, SAP_SYSTEM_TYPE=${process.env.SAP_SYSTEM_TYPE || '(not set)'}`);
                            continue;
                        }
                    }
                    // Register wrapped handler via SDK registerTool
                    // Note: connection is NOT part of MCP tool signature
                    this.registerTool(entry.toolDefinition.name, {
                        description: entry.toolDefinition.description,
                        inputSchema: zodSchema,
                    }, wrappedHandler);
                }
            }
        }
        else {
            // Fallback: use registerAllTools directly (handlers won't have connection injected)
            // This should not happen in normal flow
            handlersRegistry.registerAllTools(this);
        }
    }
}
exports.BaseMcpServer = BaseMcpServer;
function getDefaultLogger() {
    return stderrLogger;
}
/**
 * Logger that writes all levels to stderr.
 * Safe for stdio mode — never writes to stdout (reserved for JSON-RPC protocol).
 */
const stderrLogger = {
    info: (msg) => process.stderr.write(`[INFO] ${msg}\n`),
    debug: (msg) => process.stderr.write(`[DEBUG] ${msg}\n`),
    warn: (msg) => process.stderr.write(`[WARN] ${msg}\n`),
    error: (msg) => process.stderr.write(`[ERROR] ${msg}\n`),
};
//# sourceMappingURL=BaseMcpServer.js.map