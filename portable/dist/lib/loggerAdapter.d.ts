/**
 * Logger adapter that wraps the server logger to implement ILogger interface
 * from @mcp-abap-adt/interfaces package
 */
import type { ILogger } from '@mcp-abap-adt/interfaces';
/**
 * Adapter that implements ILogger interface using the server's logger
 *
 * Note: The ILogger interface only includes basic logging methods (info, error, warn, debug).
 * Additional methods like csrfToken and tlsConfig are handled by the server logger directly
 * and are not part of the ILogger interface.
 */
export declare const loggerAdapter: ILogger;
//# sourceMappingURL=loggerAdapter.d.ts.map