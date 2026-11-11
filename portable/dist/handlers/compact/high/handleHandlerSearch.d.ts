import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerSearch";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Find things. operation='object' (needs object_name) | 'source' (needs query + packages, onprem only) | 'where_used' (needs object_name + object_type). Response: JSON.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly operation: {
                readonly type: "string";
                readonly enum: readonly ["object", "source", "where_used"];
                readonly description: "'object' finds objects by name; 'source' scans source text inside packages (onprem only); 'where_used' lists references to one object.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Required for operation='object' and 'where_used'.";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "Object type. Required for operation='where_used' (e.g. 'class', 'table').";
            };
            readonly query: {
                readonly type: "string";
                readonly description: "Required for operation='source'. Substring to match.";
            };
            readonly packages: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: "Required for operation='source'. PACKAGE names (not object names), e.g. [\"$TMP\"]. Narrow this — it is what makes the scan fast.";
            };
            readonly max_results: {
                readonly type: "number";
                readonly description: "Result cap.";
            };
        };
        readonly required: readonly ["operation"];
    };
};
type HandlerSearchArgs = {
    operation?: string;
    object_name?: string;
    object_type?: string;
    query?: string;
    packages?: string[];
    max_results?: number;
};
export declare function handleHandlerSearch(context: HandlerContext, args: HandlerSearchArgs): Promise<{
    isError: boolean;
    content: any[];
}>;
export {};
//# sourceMappingURL=handleHandlerSearch.d.ts.map