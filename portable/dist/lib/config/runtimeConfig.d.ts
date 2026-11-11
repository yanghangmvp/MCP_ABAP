export declare function parseEnvArg(): string | undefined;
export declare function parseAuthBrokerPathArg(): string | undefined;
export declare function parseMcpDestinationArg(): string | undefined;
export declare function parseBrowserArg(): string | undefined;
export declare function getTransportType(): string | null;
export declare function resolveEnvFromCwd(): string | undefined;
export declare function buildRuntimeConfig(): {
    useAuthBroker: boolean;
    isTestEnv: boolean;
    authBrokerPath: string | undefined;
    defaultMcpDestination: string | undefined;
    browser: string | undefined;
    unsafe: boolean;
    explicitTransportType: string | null;
    transportType: string;
    isHttp: boolean;
    isSse: boolean;
    isStdio: boolean;
    isEnvMandatory: boolean;
    envFilePath: string | undefined;
};
//# sourceMappingURL=runtimeConfig.d.ts.map