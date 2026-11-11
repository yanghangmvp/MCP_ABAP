import * as http from 'node:http';
import * as https from 'node:https';
import type { TlsConfig } from '../lib/config/IServerConfig.js';
/**
 * Create HTTP or HTTPS server based on TLS configuration.
 *
 * When `tls` is provided with cert + key paths, creates an HTTPS server.
 * Otherwise creates a plain HTTP server.
 *
 * @param app - Express application (or any http.RequestListener)
 * @param tls - Optional TLS configuration with file paths
 * @returns http.Server or https.Server
 */
export declare function createServerListener(app: http.RequestListener, tls?: TlsConfig): http.Server | https.Server;
/**
 * Returns the protocol string based on TLS configuration.
 */
export declare function getProtocol(tls?: TlsConfig): 'https' | 'http';
//# sourceMappingURL=tlsUtils.d.ts.map