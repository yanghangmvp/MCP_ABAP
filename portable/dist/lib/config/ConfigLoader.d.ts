/**
 * Unified configuration loader
 * Loads YAML config and merges with CLI arguments (CLI overrides YAML)
 * Used by both old server (mcp_abap_adt_server) and new servers
 */
import type { IServerConfig } from '../../server/IServerConfig.js';
export declare class ConfigLoader {
    /**
     * Load and merge configuration from CLI arguments and YAML file
     * CLI arguments override YAML values
     */
    static load(): IServerConfig;
    /**
     * Merge YAML config into CLI arguments (CLI overrides YAML)
     */
    private static mergeConfig;
    /**
     * Build transport configuration from parsed arguments
     */
    private static buildTransportConfig;
}
//# sourceMappingURL=ConfigLoader.d.ts.map