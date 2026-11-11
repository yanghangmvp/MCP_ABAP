import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetEnhancementImpl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve source code of a specific enhancement implementation by its name and enhancement spot.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly enhancement_spot: {
                readonly type: "string";
                readonly description: "Name of the enhancement spot";
            };
            readonly enhancement_name: {
                readonly type: "string";
                readonly description: "[read-only] Name of the enhancement implementation";
            };
        };
        readonly required: readonly ["enhancement_spot", "enhancement_name"];
    };
};
/**
 * Interface for enhancement by name response
 */
export interface EnhancementByNameResponse {
    enhancement_spot: string;
    enhancement_name: string;
    source_code: string;
}
/**
 * Handler to retrieve a specific enhancement implementation by name in an ABAP system.
 * This function is intended for retrieving the source code of a specific enhancement implementation (requires both spot and implementation name).
 * This function uses the SAP ADT API endpoint to fetch the source code of a specific enhancement
 * implementation within a given enhancement spot. If the implementation is not found, it falls back
 * to retrieving metadata about the enhancement spot itself to provide context about the failure.
 *
 * @param args - Tool arguments containing:
 *   - enhancement_spot: Name of the enhancement spot (e.g., 'enhoxhh'). This is a required parameter.
 *   - enhancement_name: Name of the specific enhancement implementation (e.g., 'zpartner_update_pai'). This is a required parameter.
 * @returns Response object containing:
 *   - If successful: enhancement_spot, enhancement_name, source_code, and raw_xml of the enhancement implementation.
 *   - If implementation not found: enhancement_spot, enhancement_name, status as 'not_found', a message, spot_metadata, and raw_xml of the spot.
 *   - In case of error: an error object with details about the failure.
 */
export declare function handleGetEnhancementImpl(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        json: EnhancementByNameResponse;
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        json: {
            enhancement_spot: any;
            enhancement_name: any;
            status: string;
            message: string;
            spot_metadata: {
                description?: string;
            };
        };
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetEnhancementImpl.d.ts.map