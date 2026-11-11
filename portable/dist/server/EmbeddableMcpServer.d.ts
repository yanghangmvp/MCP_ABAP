import type { AbapConnection } from '@mcp-abap-adt/connection';
import type { Logger } from '@mcp-abap-adt/logger';
import { type IReadOnlyDedupStrategy } from '../lib/handlers/groups/strategies/index.js';
import type { IHandlersRegistry, SapEnvironment } from '../lib/handlers/interfaces.js';
import type { IAdtSystemContext } from '../lib/systemContext.js';
import { BaseMcpServer } from './BaseMcpServer.js';
/**
 * Options for EmbeddableMcpServer
 */
export interface EmbeddableMcpServerOptions {
    /**
     * ABAP connection to use for all handler calls
     * Injected from consumer (e.g., CloudSdkAbapConnection in cloud-llm-hub)
     */
    connection: AbapConnection;
    /**
     * Logger instance
     * @default defaultLogger
     */
    logger?: Logger;
    /**
     * Handlers registry to use
     * If not provided, default registry is created based on exposition option
     */
    handlersRegistry?: IHandlersRegistry;
    /**
     * Exposition levels to include when creating default registry
     * @default ['readonly', 'high']
     */
    exposition?: ('readonly' | 'high' | 'low' | 'compact' | 'system' | 'search')[];
    /**
     * Server version
     * @default from package.json or '1.0.0'
     */
    version?: string;
    /**
     * System context (masterSystem, responsible, client, isLegacy).
     * Set this to avoid HTTP calls that resolve system info at runtime.
     * If not provided, handlers will use whatever is available from env vars.
     */
    systemContext?: Partial<IAdtSystemContext>;
    /**
     * SAP system type for this server instance. Governs which tools are
     * registered via the `available_in` filter. Overrides the process-global
     * `SAP_SYSTEM_TYPE` env var. If omitted, falls back to the env var,
     * then to `'cloud'`.
     *
     * Use this when a single host serves multiple SAP systems (e.g., a proxy
     * that handles both OnPremise and cloud destinations per request) —
     * mutating `process.env.SAP_SYSTEM_TYPE` per instance is not safe.
     */
    systemType?: SapEnvironment;
    /**
     * Optional strategy that decides which readonly handlers to dedup (hide)
     * when overriding groups (high / low / compact) are also exposed.
     *
     * Default: `ReadVsGetDedupStrategy` — hides a readonly `Read<X>` handler
     * when a corresponding `Get<X>` is contributed by another group, so a single
     * deterministic tool is exposed per operation (matching the standalone
     * launcher). Pass `new NoDedupStrategy()` (exported from this package) to
     * expose readonly handlers verbatim, or supply a custom implementation for
     * bespoke role-based rules.
     */
    readOnlyDedupStrategy?: IReadOnlyDedupStrategy;
}
/**
 * Embeddable MCP Server for integration with external applications
 *
 * This server is designed for consumers like cloud-llm-hub that:
 * - Have their own connection management (e.g., BTP destinations, Cloud SDK)
 * - Create new server instance per request (SSE/HTTP mode)
 * - Need to inject connection from outside
 *
 * Usage:
 * ```typescript
 * // Create connection (consumer's own implementation)
 * const connection = new CloudSdkAbapConnection(config);
 *
 * // Create embeddable server with injected connection
 * const server = new EmbeddableMcpServer({
 *   connection,
 *   logger: myLogger,
 *   exposition: ['readonly', 'high'],
 * });
 *
 * // Connect transport and handle request
 * await server.connect(transport);
 * ```
 */
export declare class EmbeddableMcpServer extends BaseMcpServer {
    private readonly injectedConnection;
    constructor(options: EmbeddableMcpServerOptions);
    /**
     * Returns the injected connection
     * Called by BaseMcpServer.registerHandlers() wrapper lambdas
     */
    protected getConnection(): Promise<AbapConnection>;
    /**
     * Creates default handlers registry based on exposition levels
     */
    private createDefaultRegistry;
}
//# sourceMappingURL=EmbeddableMcpServer.d.ts.map