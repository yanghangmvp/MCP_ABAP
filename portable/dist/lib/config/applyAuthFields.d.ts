import type { SapConfig } from '@mcp-abap-adt/connection';
/**
 * Populate auth-type-specific fields on a SapConfig from env.
 * Returns true if it handled the auth type (so the caller skips the basic user/pass requirement).
 * Handles: certificate, kerberos. Returns false for basic/saml (caller handles those).
 */
export declare function applyCertKerberosFields(config: SapConfig, env: NodeJS.ProcessEnv): boolean;
//# sourceMappingURL=applyAuthFields.d.ts.map