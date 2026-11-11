import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
export interface IAdtSystemContext {
    masterSystem?: string;
    responsible?: string;
    client?: string;
    isLegacy?: boolean;
    /** Master/original language for created objects (adtcore:masterLanguage). From SAP_LANGUAGE; library defaults to EN when unset. */
    masterLanguage?: string;
}
export declare function resolveSystemContext(connection: IAbapConnection, overrides?: Partial<IAdtSystemContext>): Promise<IAdtSystemContext>;
export declare function getSystemContext(): IAdtSystemContext;
/**
 * Set system context explicitly (safe, no HTTP requests).
 * Use this when system info is known upfront (e.g., from BTP destination metadata).
 */
export declare function setSystemContext(context: Partial<IAdtSystemContext>): void;
export declare function resetSystemContextCache(): void;
//# sourceMappingURL=systemContext.d.ts.map