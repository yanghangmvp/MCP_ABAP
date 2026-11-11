/**
 * GetTransport Handler - Retrieve ABAP transport request information via ADT API
 *
 * Retrieves transport request details including:
 * - Transport metadata (number, description, type, status)
 * - Owner and target system information
 * - Included objects and tasks
 * - Change history
 *
 * @TODO Migrate to infrastructure module or enhance AdtClient.getRequest().read()
 * Current AdtClient.getRequest().read() doesn't support:
 * - includeObjects and includeTasks query parameters
 * - XML parsing (returns raw AxiosResponse)
 * This handler provides richer functionality that should be added to adt-clients
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTransport";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve ABAP transport request information including metadata, included objects, and status from SAP system. include_objects: false strips objects from the task entries too.";
    readonly notes: "Response size. A request's objects appear in TWO places: flat under the request, and nested\ninside each of its tasks. include_objects: false removes both (a caller who asked for \"no objects\"\nused to still get every object nested under the tasks — 68 KB / 2467 lines for a request whose\nobject-free answer is ~20 lines). To see only the request header, pass include_objects: false AND\ninclude_tasks: false.\n\nobject_count / task_count always report what was PARSED, so they read 0 when the corresponding flag\nis false. Use them to judge the response you asked for, not the size of the request.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly transport_number: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001, ABCK900002)";
            };
            readonly include_objects: {
                readonly type: "boolean";
                readonly description: "Include list of objects in transport (default: true)";
                readonly default: true;
            };
            readonly include_tasks: {
                readonly type: "boolean";
                readonly description: "Include list of tasks in transport (default: true)";
                readonly default: true;
            };
        };
        readonly required: readonly ["transport_number"];
    };
};
interface GetTransportArgs {
    transport_number: string;
    include_objects?: boolean;
    include_tasks?: boolean;
}
/**
 * Parse transport request XML response
 */
export declare function parseTransportXml(xmlData: string, includeObjects?: boolean, includeTasks?: boolean): any;
/**
 * Main handler for GetTransport MCP tool
 */
export declare function handleGetTransport(context: HandlerContext, args: GetTransportArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetTransport.d.ts.map