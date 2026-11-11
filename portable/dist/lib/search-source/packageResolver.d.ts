import type { HandlerContext } from '../handlers/interfaces';
export interface SearchObjectsArgs {
    query: string;
    objectType: 'DEVC';
    maxResults: number;
}
export type SearchObjectsFn = (args: SearchObjectsArgs) => Promise<string[]>;
export interface PackageResolverDeps {
    searchObjects: SearchObjectsFn;
}
export declare function resolvePackagePatterns(deps: PackageResolverDeps, entries: string[]): Promise<string[]>;
export declare function createPackagePatternResolver(ctx: HandlerContext): SearchObjectsFn;
//# sourceMappingURL=packageResolver.d.ts.map