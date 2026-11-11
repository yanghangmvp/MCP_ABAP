/**
 * Server Configuration Manager
 *
 * Central configuration management for MCP ABAP ADT Server
 * Handles:
 * - Command line arguments parsing
 * - YAML configuration file loading (via yamlConfig DI)
 * - Configuration template generation (via yamlConfig DI)
 * - Handler exposition control
 *
 * Uses dependency injection pattern to reuse existing yamlConfig infrastructure
 */
import type { IServerConfig } from './IServerConfig.js';
export type { HandlerSet, Transport } from './IServerConfig.js';
/**
 * Server Configuration Manager
 */
export declare class ServerConfigManager {
    private config;
    /**
     * Get current configuration with async YAML support
     * Uses existing yamlConfig infrastructure via DI
     */
    getConfig(): Promise<IServerConfig>;
    /**
     * Get current configuration synchronously (for backward compatibility)
     * Note: If used before getConfig(), will not include YAML config values
     */
    getConfigSync(): IServerConfig;
    /**
     * Load YAML configuration if --conf parameter is present
     * Delegates to yamlConfig module via DI
     */
    private loadYamlConfigIfNeeded;
    /**
     * Parse command line arguments
     * Note: Should be called after applyYamlConfigToArgs for proper YAML support
     * Uses ArgumentsParser for unified CLI parsing
     */
    private parseCommandLine;
    /**
     * Parse transport from command line or environment variable
     */
    private parseTransport;
    /**
     * Parse port from command line. Rejects non-numeric or out-of-range values
     * instead of parseInt's silent truncation (--port=3000abc → 3000) / NaN.
     */
    private parsePort;
    /**
     * Parse handler exposition from command line
     * Format: --exposition=readonly,high,low,compact
     */
    private parseExposition;
    /**
     * Get handler sets description for help text
     */
    static getHandlerSetsDescription(): string;
    /**
     * Generate complete help text with all configuration options
     */
    static generateHelp(additionalSections?: string): string;
}
//# sourceMappingURL=ServerConfigManager.d.ts.map