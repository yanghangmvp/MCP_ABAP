type ObjectsListCacheType = any | null;
declare class ObjectsListCache {
    private cache;
    setCache(data: any): void;
    getCache(): ObjectsListCacheType;
    clearCache(): void;
}
export declare const objectsListCache: ObjectsListCache;
export {};
//# sourceMappingURL=getObjectsListCache.d.ts.map