import type { SapAuthType } from '@mcp-abap-adt/interfaces';
/** Resolve SAP auth type from env. SAP_JWT_TOKEN forces jwt; SAP_AUTH_TYPE is explicit; default basic. */
export declare function parseAuthType(env: NodeJS.ProcessEnv | Record<string, string | undefined>): SapAuthType;
//# sourceMappingURL=parseAuthType.d.ts.map