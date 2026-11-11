type McpResponse = {
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
};
/**
 * Normalizes a low-level check handler response for high-level consumption.
 * - Strips session_id and session_state from JSON payload
 * - Adds object_name as canonical shared field
 * - Passes through error responses and non-JSON payloads unchanged
 */
export declare function normalizeCheckResponse(result: McpResponse, objectName: string): McpResponse;
export {};
//# sourceMappingURL=normalizeCheckResponse.d.ts.map