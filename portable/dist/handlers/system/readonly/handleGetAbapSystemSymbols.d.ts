import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAbapSystemSymbols";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Resolve ABAP symbols from semantic analysis with SAP system information including types, scopes, descriptions, and packages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly code: {
                readonly type: "string";
                readonly description: "ABAP source code to analyze and resolve symbols for";
            };
        };
        readonly required: readonly ["code"];
    };
};
interface AbapSymbolInfo {
    name: string;
    type: 'class' | 'method' | 'function' | 'variable' | 'constant' | 'type' | 'interface' | 'form' | 'program' | 'report' | 'include';
    scope: string;
    line: number;
    column: number;
    description?: string;
    package?: string;
    visibility?: 'public' | 'protected' | 'private';
    dataType?: string;
    parameters?: AbapParameterInfo[];
    systemInfo?: AbapSystemInfo;
}
interface AbapParameterInfo {
    name: string;
    type: 'importing' | 'exporting' | 'changing' | 'returning';
    dataType?: string;
    optional?: boolean;
    defaultValue?: string;
}
interface AbapSystemInfo {
    exists: boolean;
    objectType?: string;
    description?: string;
    package?: string;
    responsible?: string;
    lastChanged?: string;
    sapRelease?: string;
    techName?: string;
    methods?: string[];
    interfaces?: string[];
    superClass?: string;
    attributes?: string[];
    error?: string;
}
interface AbapSystemSymbolsResult {
    symbols: AbapSymbolInfo[];
    dependencies: string[];
    errors: AbapParseError[];
    scopes: AbapScopeInfo[];
    systemResolutionStats: {
        totalSymbols: number;
        resolvedSymbols: number;
        failedSymbols: number;
        resolutionRate: string;
    };
}
interface AbapParseError {
    message: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
}
interface AbapScopeInfo {
    name: string;
    type: 'global' | 'class' | 'method' | 'form' | 'function' | 'local';
    startLine: number;
    endLine: number;
    parent?: string;
}
export declare function handleGetAbapSystemSymbols(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        json: AbapSystemSymbolsResult;
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetAbapSystemSymbols.d.ts.map