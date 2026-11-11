/**
 * Logger module for MCP-compatible logging
 *
 * This file provides logging utilities that work both in regular console mode
 * and with the MCP Inspector. It avoids direct console.log calls which can
 * interfere with MCP's JSON-RPC communication.
 */
export declare const logger: {
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
    tlsConfig: (rejectUnauthorized: boolean) => void;
    csrfToken: (type: "fetch" | "success" | "error" | "retry", message: string, data?: any) => void;
};
export declare const handlerLogger: {
    info: (handlerName: string, step: string, message: string, data?: any) => void;
    warn: (handlerName: string, step: string, message: string, data?: any) => void;
    error: (handlerName: string, step: string, message: string, data?: any) => void;
    debug: (handlerName: string, step: string, message: string, data?: any) => void;
};
export declare const connectionManagerLogger: {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
};
//# sourceMappingURL=logger.d.ts.map