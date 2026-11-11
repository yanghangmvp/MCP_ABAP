import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetEnhancementSpot";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve metadata and list of implementations for a specific enhancement spot.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly enhancement_spot: {
                readonly type: "string";
                readonly description: "Name of the enhancement spot";
            };
        };
        readonly required: readonly ["enhancement_spot"];
    };
};
/**
 * Interface for enhancement spot response
 */
export interface EnhancementSpotResponse {
    enhancement_spot: string;
    metadata: {
        description?: string;
        type?: string;
        status?: string;
    };
}
/**
 * Handler to retrieve metadata for a specific enhancement spot in an ABAP system.
 * This function uses the SAP ADT API endpoint to fetch details about an enhancement spot,
 * regardless of whether it has any implementations. It is designed to provide information
 * about the spot's existence, description, type, and status.
 *
 * @param args - Tool arguments containing:
 *   - enhancement_spot: Name of the enhancement spot (e.g., 'enhoxhh'). This is a required parameter.
 * @returns Response object containing:
 *   - enhancement_spot: The name of the queried enhancement spot.
 *   - metadata: An object with properties like description, type, and status of the enhancement spot.
 *   - raw_xml: The raw XML response from the ADT API for debugging purposes.
 *   - In case of error, an error object with details about the failure.
 */
export declare function handleGetEnhancementSpot(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        json: EnhancementSpotResponse;
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetEnhancementSpot.d.ts.map