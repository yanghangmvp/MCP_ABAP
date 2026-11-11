import type { AuthBroker } from '@mcp-abap-adt/auth-broker';
import type { Logger } from '@mcp-abap-adt/logger';
import type { IHandlersRegistry } from '../lib/handlers/interfaces.js';
import { BaseMcpServer } from './BaseMcpServer.js';
export interface StdioServerOptions {
    name?: string;
    version?: string;
    logger?: Logger;
}
/**
 * Minimal stdio server implementation based on BaseMcpServer.
 * Sets connection context once at startup and connects stdio transport.
 */
export declare class StdioServer extends BaseMcpServer {
    private readonly handlersRegistry;
    private readonly broker;
    constructor(handlersRegistry: IHandlersRegistry, broker: AuthBroker, opts?: StdioServerOptions);
    start(destination: string): Promise<void>;
}
//# sourceMappingURL=StdioServer.d.ts.map