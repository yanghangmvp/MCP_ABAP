/**
 * YAML configuration file support for mcp-abap-adt
 * Allows loading startup parameters from YAML file instead of command-line arguments
 */
export interface YamlConfig {
    transport?: string;
    mcp?: string;
    env?: string;
    'env-path'?: string;
    unsafe?: boolean;
    'auth-broker'?: boolean;
    'auth-broker-path'?: string;
    exposition?: string | string[];
    /** Accept x-sap-* direct-connection headers on HTTP/SSE. Default true. */
    'allow-direct-sap-headers'?: boolean;
    http?: {
        port?: number;
        host?: string;
        'json-response'?: boolean;
        'allowed-origins'?: string[];
        'allowed-hosts'?: string[];
        'enable-dns-protection'?: boolean;
        tls?: {
            cert?: string;
            key?: string;
            ca?: string;
        };
    };
    sse?: {
        port?: number;
        host?: string;
        'allowed-origins'?: string[];
        'allowed-hosts'?: string[];
        'enable-dns-protection'?: boolean;
        tls?: {
            cert?: string;
            key?: string;
            ca?: string;
        };
    };
}
/**
 * Parse --conf / --config argument from command line
 */
export declare function parseConfigArg(): string | undefined;
/**
 * Validate YAML configuration
 * @returns Object with valid flag and array of error messages
 */
export declare function validateYamlConfig(config: YamlConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Load YAML configuration from file
 */
export declare function loadYamlConfig(configPath: string): YamlConfig | null;
/**
 * Generate YAML configuration template
 */
export declare function generateYamlConfigTemplate(): string;
/**
 * Generate YAML config template file if it doesn't exist
 * @returns true if template was generated (file didn't exist), false if file already existed
 */
export declare function generateConfigTemplateIfNeeded(configPath: string): boolean;
/**
 * Apply YAML config values to process.argv (for compatibility with existing parsers)
 * Only applies values that are not already set in command-line arguments
 */
export declare function applyYamlConfigToArgs(config: YamlConfig): void;
//# sourceMappingURL=yamlConfig.d.ts.map