/**
 * Platform-specific storage implementations for mcp-abap-adt
 *
 * Updated to use new @mcp-abap-adt/auth-stores package
 */
export { getPlatformPaths } from './platformPaths';
import type { ILogger, IServiceKeyStore, ISessionStore } from '@mcp-abap-adt/interfaces';
/**
 * Auto-detect service key format and return appropriate stores
 * @param directory Directory where service keys are stored
 * @param destination Destination name to check (optional, for auto-detection)
 * @returns Object with serviceKeyStore and sessionStore instances
 */
export declare function detectStoreType(directory: string, destination?: string, logger?: ILogger): Promise<{
    serviceKeyStore: IServiceKeyStore;
    sessionStore: ISessionStore;
    storeType: 'abap' | 'btp';
}>;
/**
 * Get platform-specific stores based on current OS
 * @param customPath Optional custom path (overrides platform defaults)
 * @param unsafe If true, use file-based SessionStore (persists to disk). If false, use SafeSessionStore (default, in-memory, secure).
 * @param destination Optional destination name for auto-detection of store type
 * @returns Object with serviceKeyStore and sessionStore instances
 */
export declare function getPlatformStores(customPath?: string | string[], unsafe?: boolean, _destination?: string): {
    serviceKeyStore: IServiceKeyStore;
    sessionStore: ISessionStore;
};
/**
 * Get platform-specific stores with auto-detection of service key format
 * This is an async version that can detect the service key format
 * @param customPath Optional custom path (overrides platform defaults)
 * @param unsafe If true, use file-based SessionStore (persists to disk). If false, use SafeSessionStore (default, in-memory, secure).
 * @param destination Destination name for auto-detection of store type
 * @returns Promise with serviceKeyStore and sessionStore instances
 */
export declare function getPlatformStoresAsync(customPath?: string | string[], unsafe?: boolean, destination?: string, logger?: ILogger): Promise<{
    serviceKeyStore: IServiceKeyStore;
    sessionStore: ISessionStore;
    storeType: 'abap' | 'btp';
}>;
//# sourceMappingURL=index.d.ts.map