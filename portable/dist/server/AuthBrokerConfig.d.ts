/**
 * V2 Server configuration adapter for AuthBrokerFactory
 * Maps v2 ServerConfig to IAuthBrokerFactoryConfig
 */
import type { ILogger } from '@mcp-abap-adt/interfaces';
import type { IAuthBrokerFactoryConfig } from '../lib/auth/IAuthBrokerFactoryConfig.js';
import type { IServerConfig } from './IServerConfig.js';
export declare class AuthBrokerConfig implements IAuthBrokerFactoryConfig {
    defaultMcpDestination?: string;
    defaultDestination?: string;
    envFilePath?: string;
    authBrokerPath?: string;
    unsafe: boolean;
    transportType: string;
    useAuthBroker?: boolean;
    browserAuthPort?: number;
    browser?: string;
    logger?: ILogger;
    constructor(serverConfig: IServerConfig, logger?: ILogger);
    static fromServerConfig(config: IServerConfig, logger?: ILogger): AuthBrokerConfig;
}
//# sourceMappingURL=AuthBrokerConfig.d.ts.map