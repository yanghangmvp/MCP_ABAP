export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectNodeFromCache";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Returns a node from the in-memory objects list cache by OBJECT_TYPE, OBJECT_NAME, TECH_NAME, and expands OBJECT_URI if present.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly description: "[read-only] Object type";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "[read-only] Object name";
            };
            readonly tech_name: {
                readonly type: "string";
                readonly description: "[read-only] Technical name";
            };
        };
        readonly required: readonly ["object_type", "object_name", "tech_name"];
    };
};
import type { HandlerContext } from '../../../lib/handlers/interfaces';
/**
 * @param args { object_type, object_name, tech_name }
 * @returns cached node including object_uri_response when OBJECT_URI exists
 */
export declare function handleGetObjectNodeFromCache(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
} | {
    content: {
        type: string;
        json: any;
    }[];
    isError?: undefined;
}>;
//# sourceMappingURL=handleGetObjectNodeFromCache.d.ts.map