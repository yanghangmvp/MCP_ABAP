/**
 * V2 Server configuration
 * Re-exports unified IServerConfig from lib/config
 */
export type { HandlerSet, IServerConfig, Transport, } from '../lib/config/IServerConfig.js';
import type { HandlerSet, IServerConfig as IBaseServerConfig, Transport } from '../lib/config/IServerConfig.js';
/**
 * V2 Server configuration with required fields
 * @deprecated Use IServerConfig from lib/config/IServerConfig.js
 */
export interface IV2ServerConfig extends IBaseServerConfig {
    transport: Transport;
    exposition: HandlerSet[];
}
//# sourceMappingURL=IServerConfig.d.ts.map