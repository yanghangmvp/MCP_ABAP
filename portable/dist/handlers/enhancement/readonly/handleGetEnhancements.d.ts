import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetEnhancements";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve a list of enhancements for a given ABAP object.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_name: {
                readonly type: "string";
                readonly description: "Name of the ABAP object";
            };
            readonly object_type: {
                readonly type: "string";
                readonly description: "[read-only] Type of the ABAP object";
            };
        };
        readonly required: readonly ["object_name", "object_type"];
    };
};
/**
 * Interface for enhancement implementation data
 */
export interface EnhancementImplementation {
    name: string;
    type: string;
    sourceCode?: string;
    description?: string;
}
/**
 * Interface for parsed enhancement response
 */
export interface EnhancementResponse {
    object_name: string;
    object_type: 'program' | 'include' | 'class';
    context?: string;
    enhancements: EnhancementImplementation[];
    detailed?: boolean;
    total_enhancements?: number;
}
/**
 * Parses enhancement XML to extract enhancement implementations with their source code
 * @param xmlData - Raw XML response from ADT
 * @returns Array of enhancement implementations
 */
export declare function parseEnhancementsFromXml(xmlData: string): EnhancementImplementation[];
/**
 * Handler to retrieve enhancement implementations for ABAP programs/includes
 * Automatically determines if object is a program or include and handles accordingly
 *
 * @param args - Tool arguments containing:
 *   - object_name: Name of the ABAP object
 *   - program: Optional manual program context for includes
 *   - include_nested: Optional boolean - if true, also searches enhancements in all nested includes
 *   - detailed: Optional boolean - if false (default), returns minimal info; if true, returns full details including raw XML
 *   - timeout: Optional timeout in milliseconds for each ADT request (default: 30000ms = 30s)
 *   - max_includes: Optional maximum number of includes to process (default: 50)
 * @returns Response with parsed enhancement data or error
 */
export declare function handleGetEnhancements(context: HandlerContext, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetEnhancements.d.ts.map