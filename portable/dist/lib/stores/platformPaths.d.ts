/**
 * Platform-specific path resolution for mcp-abap-adt
 *
 * Defines default paths for service keys and sessions:
 * - Unix: ~/.config/mcp-abap-adt/service-keys, ~/.config/mcp-abap-adt/sessions
 * - Windows: %USERPROFILE%\Documents\mcp-abap-adt\service-keys, %USERPROFILE%\Documents\mcp-abap-adt\sessions
 */
/**
 * Get platform-specific default paths for service keys and sessions
 *
 * Priority:
 * 1. Custom path (if provided)
 * 2. AUTH_BROKER_PATH environment variable
 * 3. Platform-specific standard paths:
 *    - Unix: ~/.config/mcp-abap-adt/service-keys, ~/.config/mcp-abap-adt/sessions
 *    - Windows: %USERPROFILE%\Documents\mcp-abap-adt\service-keys, %USERPROFILE%\Documents\mcp-abap-adt\sessions
 * 4. Current working directory (process.cwd())
 *
 * @param customPath Optional custom path (highest priority)
 * @param subfolder Subfolder name ('service-keys' or 'sessions')
 * @returns Array of resolved absolute paths
 */
export declare function getPlatformPaths(customPath?: string | string[], subfolder?: 'service-keys' | 'sessions'): string[];
//# sourceMappingURL=platformPaths.d.ts.map