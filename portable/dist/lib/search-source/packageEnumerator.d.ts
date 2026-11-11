import type { HandlerContext } from '../handlers/interfaces';
export type ScanObjectType = 'PROG' | 'FUGR' | 'CLAS';
export interface PackageContentItem {
    name: string;
    adtType: string;
    packageName: string;
    isPackage: boolean;
}
export interface EnumeratedObject {
    devclass: string;
    object_type: ScanObjectType;
    object_name: string;
}
export interface EnumerateInput {
    packages: string[];
    include_subpackages: boolean;
    object_filter?: string;
    object_types: readonly ScanObjectType[];
}
export type PackageContentsFetcher = (packageName: string, options: {
    includeSubpackages: boolean;
}) => Promise<PackageContentItem[]>;
export declare function enumerateScanTargets(fetch: PackageContentsFetcher, input: EnumerateInput): Promise<EnumeratedObject[]>;
export declare function createPackageContentsFetcher(ctx: HandlerContext): PackageContentsFetcher;
//# sourceMappingURL=packageEnumerator.d.ts.map