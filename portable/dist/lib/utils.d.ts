import { AsyncLocalStorage } from 'node:async_hooks';
import { getTimeout, getTimeoutConfig, type SapConfig } from '@mcp-abap-adt/connection';
import type { IAbapConnection, IAdtResponse } from '@mcp-abap-adt/interfaces';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { type AxiosResponse } from 'axios';
import { logger } from './logger';
export declare const sessionContext: AsyncLocalStorage<{
    sessionId?: string;
    sapConfig?: SapConfig;
    destination?: string;
}>;
declare global {
    var __mcpAbapAdtAuthBrokerRegistry: Map<string, any> | undefined;
}
/**
 * Register AuthBroker instance for a destination
 * This allows JwtAbapConnection to use AuthBroker for token refresh when destination is set
 */
export declare function registerAuthBroker(destination: string, authBroker: any): void;
/**
 * Get AuthBroker instance for a destination
 * Returns undefined if not registered
 * This function can be called from @mcp-abap-adt/connection package via global registry
 */
export declare function getAuthBroker(destination: string): any | undefined;
export type { AxiosResponse };
export { ErrorCode, getTimeout, getTimeoutConfig, logger, McpError };
/**
 * Encodes SAP object names for use in URLs.
 * Mirrors @mcp-abap-adt/adt-clients internal util but avoids unstable exports.
 */
export declare function encodeSapObjectName(objectName: string): string;
export declare function return_response(response: IAdtResponse | AxiosResponse): {
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
};
/**
 * Safely logs an error without circular reference issues
 */
export declare function logErrorSafely(logger: any, operationName: string, error: any): void;
/**
 * Extracts a user-facing ADT/SAP error message from Axios/ADT errors.
 * Prioritizes XML exception payloads (<exc:exception>) for detailed messages.
 */
export declare function extractAdtErrorMessage(error: any, fallback?: string): string;
export declare function return_error(error: any): {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
};
export declare function getManagedConnection(): IAbapConnection;
/**
 * Remove connection from cache for a specific session
 * Called when session is closed
 *
 * If destination is provided, removes only the connection for that specific destination.
 * If destination is not provided, removes all connections for the session (all destinations).
 */
export declare function removeConnectionForSession(sessionId: string, config?: SapConfig, destination?: string): void;
/**
 * Restore session state in connection
 * Note: Session state management (getSessionState/setSessionState) was removed in connection 0.2.0
 * Session state persistence is now handled by @mcp-abap-adt/auth-broker package
 * This function now only sets session type to stateful and session ID
 */
export declare function restoreSessionInConnection(connection: IAbapConnection, sessionId: string, _sessionState: {
    cookies?: string | null;
    csrf_token?: string | null;
    cookie_store?: Record<string, string>;
}): Promise<void>;
export declare function setConfigOverride(override?: SapConfig): void;
export declare function setConnectionOverride(connection?: IAbapConnection): void;
export declare function cleanup(): void;
/**
 * Invalidate cached connection to force recreation with updated config
 * This is useful when config is updated directly (e.g., token refresh in JwtAbapConnection)
 * The connection will be recreated on next getManagedConnection() call with updated signature
 */
export declare function invalidateConnectionCache(): void;
export declare function getBaseUrl(): Promise<string>;
/**
 * Makes an ADT request with specified timeout
 * @param url Request URL
 * @param method HTTP method
 * @param timeoutType Timeout type ('default', 'csrf', 'long') or custom number in ms
 * @param data Optional request data
 * @param params Optional request parameters
 * @param headers Optional custom headers
 * @returns Promise with the response
 */
export declare function makeAdtRequestWithTimeout(connection: IAbapConnection, url: string, method: string, timeoutType?: 'default' | 'csrf' | 'long' | number, data?: any, params?: any, headers?: Record<string, string>): Promise<AxiosResponse>;
/**
 * Force an EXPLICIT `x-sap-adt-sessiontype: stateless` header on every request
 * of this connection until the returned restore() is called.
 *
 * The `/repository/nodestructure` endpoint bleeds a node's DESCRIPTION from a
 * previously-fetched node when a STATEFUL server-side session is alive — which
 * create/lock handlers leave open on the shared, cached connection. Setting
 * `setSessionType('stateless')` only OMITS the session header and does NOT
 * terminate the lingering session; sending the header explicitly does (both
 * verified live on DM2). Returns a restore function that reinstates the original
 * `makeAdtRequest` — always call it in a `finally`.
 */
export declare function withExplicitStatelessHeader(connection: IAbapConnection): () => void;
/**
 * Force `sap-language` on EVERY request of this connection until restore().
 *
 * MEASURED, and the measurement is the whole point: the language a DDIC text is
 * written in comes from the SERVER SESSION, and setting it on the decisive
 * request is NOT enough. `createAdtClient` injects `sap-language = SAP_LANGUAGE`
 * on every request (P1), and a write is more requests than it looks: the CSRF
 * fetch that precedes the lock POST, the lock itself, the read, the PUT. Leaving
 * any one of them on the old language leaves the session on the old language,
 * and the text lands in the WRONG row.
 *
 * Proven on DM2/310 against a $TMP canary, with T100 rows as the verdict rather
 * than an HTTP status: with only the lock and the PUT carrying sap-language=ZH,
 * the write overwrote the EN row; with every request of the write carrying it,
 * the EN row stayed byte-identical and a new SPRSL='1' row appeared. The EN
 * request that came BEFORE the wrapper did no harm, so the wrapper only has to
 * span the write.
 *
 * Overrides rather than defaults — unlike the P1 injector, whose value is what
 * this exists to displace. Always restore in a `finally`.
 */
export declare function withForcedLanguage(connection: IAbapConnection, language: string): () => void;
/**
 * Fetches node structure from SAP ADT repository
 * @deprecated Use getAdtClient().fetchNodeStructure() instead
 */
export declare function fetchNodeStructure(_connection: IAbapConnection, _parentName: string, _parentTechName: string, _parentType: string, _nodeKey: string, _withShortDescriptions?: boolean): Promise<AxiosResponse>;
export declare function makeAdtRequest(connection: IAbapConnection, url: string, method: string, timeout: number, data?: any, params?: any, headers?: Record<string, string>): Promise<AxiosResponse>;
/**
 * Get system information from SAP ADT
 * Returns cached system context resolved during connection init
 */
export declare function getSystemInformation(): Promise<{
    systemID?: string;
    userName?: string;
} | null>;
/**
 * Check if current connection is cloud (JWT auth) or on-premise (basic auth)
 * In v2 architecture, config must come from connection provider/broker, not from getConfig()
 */
export declare function isCloudConnection(config?: SapConfig): boolean;
/**
 * Parse validation response from ADT
 * Checks for CHECK_RESULT=X (success) or SEVERITY=ERROR with message
 * @param response - IAdtResponse or AxiosResponse from validation endpoint
 * @returns Parsed validation result with valid, severity, message, exists fields
 */
export declare function parseValidationResponse(response: IAdtResponse | AxiosResponse): {
    valid: boolean;
    severity?: string;
    message?: string;
    longText?: string;
    exists?: boolean;
};
/**
 * Existence gate for create handlers.
 *
 * The ADT object-validation endpoint already reports whether a name is taken,
 * but the adt-clients `validate()` wrappers return that response without
 * interpreting it (their `errors` array is always empty), so create handlers
 * historically only discovered a name clash *after* attempting create (or, for
 * long lock→update→activate chains, even later — leaving half-created objects).
 *
 * This runs the given `validate()` thunk and interprets its result via
 * {@link parseValidationResponse}, throwing a clean "already exists" error
 * BEFORE create when the name is taken. It handles both client behaviors: a
 * `validate()` that RETURNS the raw response (table/structure/view/domain/…)
 * and one that THROWS on HTTP 4xx (class-style). On any other validation
 * outcome it stays out of the way — the original response/error is preserved so
 * create() proceeds (or the real failure surfaces) exactly as before.
 *
 * Returns the validation state on success so callers that further inspect
 * `validationState` keep working.
 *
 * @param objectLabel Human-readable subject, e.g. `"Table ZFOO"` — used verbatim in the error.
 * @param validate    Thunk invoking the object-type `client.getX().validate({...})`.
 */
export declare function assertObjectDoesNotExist(objectLabel: string, validate: () => Promise<any>, connection?: IAbapConnection): Promise<any>;
/**
 * Maximum name lengths for ABAP/DDIC object types (whole name incl. Z/Y prefix
 * and any namespace `/xxx/` part). SAP does NOT syntax-check these on the ADT
 * create endpoint — an over-long name is silently TRUNCATED, so a caller who
 * asks for a too-long table sees a confusing "already exists" error on the
 * truncated name instead of a length complaint.
 *
 * Only the limits we are confident about are listed; unlisted types are not
 * enforced (assertNameLength is a no-op for them). The classic transparent-table
 * / DB-view limit of 16 is the important one — that is the reported failure.
 */
export declare const ABAP_NAME_MAX_LENGTH: Record<string, number>;
/**
 * Fail fast (BEFORE any SAP round-trip) when an object name exceeds the DDIC
 * length limit for its type. Prevents SAP's silent truncation, which otherwise
 * surfaces as a misleading "<truncated name> already exists" error.
 *
 * @param objectType Key into {@link ABAP_NAME_MAX_LENGTH} (e.g. `"table"`). If
 *                   unknown, the check is skipped.
 * @param name       The requested object name (case-insensitive; length only).
 * @param label      Human-readable subject for the error, default `"Object"`.
 */
export declare function assertNameLength(objectType: string, name: string, label?: string): void;
/**
 * Check if error message indicates object was already checked
 * Used to handle "has been checked" / "was checked" messages as non-critical
 * @param error - Error object or error message string
 * @returns true if error indicates object was already checked
 */
export declare function isAlreadyCheckedError(error: any): boolean;
/**
 * Check if error message indicates object already exists
 * Used to handle validation errors for existing objects
 * @param error - Error object or error message string
 * @returns true if error indicates object already exists
 */
export declare function isAlreadyExistsError(error: any): boolean;
/**
 * Safely handle check operation - ignores "already checked" errors
 * Wraps check operation and handles "has been checked" as non-critical
 * @param checkOperation - Promise that performs check operation
 * @param objectName - Name of object being checked (for logging)
 * @param logger - Optional logger function for debug messages
 * @returns Result of check operation or throws if real error
 */
export declare function safeCheckOperation<T>(checkOperation: () => Promise<T>, objectName: string, logger?: {
    debug?: (message: string, data?: any) => void;
}): Promise<T>;
/**
 * Display help message
 */
export declare function showHelp(): void;
export type TransportConfig = {
    type: 'stdio';
} | {
    type: 'streamable-http';
    host: string;
    port: number;
    enableJsonResponse: boolean;
    allowedOrigins?: string[];
    allowedHosts?: string[];
    enableDnsRebindingProtection: boolean;
} | {
    type: 'sse';
    host: string;
    port: number;
    allowedOrigins?: string[];
    allowedHosts?: string[];
    enableDnsRebindingProtection: boolean;
};
export declare function getArgValue(name: string): string | undefined;
export declare function hasFlag(name: string): boolean;
export declare function parseBoolean(value?: string): boolean;
export declare function resolvePortOption(argName: string, envName: string, defaultValue: number): number;
export declare function resolveBooleanOption(argName: string, envName: string, defaultValue: boolean): boolean;
export declare function resolveListOption(argName: string, envName: string): string[] | undefined;
export declare function parseTransportConfig(transportType: string): TransportConfig;
export interface ServerOptions {
    sapConfig?: SapConfig;
    connection?: IAbapConnection;
    transportConfig?: TransportConfig;
    allowProcessExit?: boolean;
    registerSignalHandlers?: boolean;
}
export declare function setSapConfigOverride(config?: SapConfig): void;
export declare function setAbapConnectionOverride(connection?: IAbapConnection): void;
export * from '@mcp-abap-adt/interfaces';
export type { IAdtSystemContext } from './systemContext.js';
export { getSystemContext, setSystemContext } from './systemContext.js';
export declare function getConfig(): SapConfig;
/**
 * Mask sensitive values (tokens, secrets) for safe logging
 *
 * Rules:
 * - Long values (>20 chars): show first 4 and last 4 chars with *** in between
 * - Short values (<=20 chars): fully mask with asterisks
 * - Empty/undefined: return placeholder
 *
 * @param value - The sensitive value to mask
 * @param placeholder - Placeholder for empty values (default: '(not set)')
 * @returns Masked string safe for logging
 */
export declare function maskSensitiveValue(value: string | undefined | null, placeholder?: string): string;
/**
 * Format auth configuration for display at server startup
 * Shows connection details with masked sensitive values
 */
export interface AuthDisplayConfig {
    envFile?: string;
    serviceUrl?: string;
    sapClient?: string;
    authType?: string;
    username?: string;
    password?: string;
    jwtToken?: string;
    refreshToken?: string;
    uaaUrl?: string;
    uaaClientId?: string;
    uaaClientSecret?: string;
}
/**
 * Format auth configuration for console output
 * @param config - Auth configuration to display
 * @param source - Source of the config (e.g., 'e19.env', 'service-key')
 * @returns Formatted string for console output
 */
export declare function formatAuthConfigForDisplay(config: AuthDisplayConfig, source?: string): string;
export declare function parseActivationResponse(responseData: any): {
    activated: boolean;
    checked: boolean;
    generated: boolean;
    messages: {
        type: string;
        text: string;
        line?: number;
        column?: number;
    }[];
};
//# sourceMappingURL=utils.d.ts.map