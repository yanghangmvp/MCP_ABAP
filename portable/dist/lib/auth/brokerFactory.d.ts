/**
 * Default implementation of AuthBrokerFactory
 * Implements unified broker creation logic according to UNIFIED_BROKER_LOGIC.md
 *
 * Key principles:
 * - One broker per destination (key = destination name or 'default')
 * - Default broker created at startup based on CLI args and .env file presence
 * - Shared stores for destinations with same directory and type
 */
import { AuthBroker } from '@mcp-abap-adt/auth-broker';
import type { IAuthBrokerFactory } from './IAuthBrokerFactory.js';
import type { IAuthBrokerFactoryConfig } from './IAuthBrokerFactoryConfig.js';
/**
 * Default implementation of IAuthBrokerFactory
 */
export declare class AuthBrokerFactory implements IAuthBrokerFactory {
    private authBrokers;
    private sharedStores;
    private config;
    private defaultBrokerInitialized;
    constructor(config: IAuthBrokerFactoryConfig);
    /**
     * Get transport type from config
     */
    private getTransportType;
    /**
     * Check if transport type supports AuthBroker
     */
    private isTransportSupported;
    /**
     * Initialize default broker based on CLI args and .env file presence
     * Called once at server startup
     *
     * Creates default broker ('default' key) according to unified logic:
     * 1. --mcp=destination → default broker with serviceKeyStore for destination
     * 2. --env=path → default broker with sessionStore from path (no serviceKeyStore)
     * 3. stdio/sse + .env in current folder + NOT --auth-broker → default broker with sessionStore (no serviceKeyStore)
     * 4. Other cases → default broker NOT created
     */
    initializeDefaultBroker(): Promise<void>;
    /**
     * Get default broker (if initialized)
     */
    getDefaultBroker(): AuthBroker | undefined;
    /**
     * Get or create AuthBroker for specific destination
     * For HTTP/SSE: called when destination is specified in headers
     * For stdio: called to get default broker
     */
    getOrCreateAuthBroker(destination?: string, _clientKey?: string): Promise<AuthBroker | undefined>;
    /**
     * Create broker for specific destination
     * Internal method used by both initializeDefaultBroker and getOrCreateAuthBroker
     */
    private createBrokerForDestination;
    /**
     * Create broker using EnvFileSessionStore directly
     * Used for --env=path option (Variant 2)
     *
     * EnvFileSessionStore reads connection config directly from .env file
     * and stores token updates in memory (doesn't modify original file)
     */
    private createBrokerWithEnvFileStore;
    /**
     * Load .env file and populate session store with connection config
     * @param envFilePath Path to .env file
     * @param destination Destination name (usually 'default')
     * @param broker AuthBroker instance
     * @param logger Logger instance
     * @returns Auth type from .env file ('basic' or 'jwt')
     */
    private loadEnvFileIntoSessionStore;
    private createTokenProviderForDestination;
    private wrapLegacyTokenProvider;
    /**
     * Get existing AuthBroker without creating new one
     */
    getAuthBroker(destination?: string): AuthBroker | undefined;
    /**
     * Clear all AuthBroker instances
     */
    clear(): void;
}
//# sourceMappingURL=brokerFactory.d.ts.map