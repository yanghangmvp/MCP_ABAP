/**
 * CreateBehaviorImplementation Handler - ABAP Behavior Implementation Creation via ADT API
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: create -> lock -> update main source -> update implementations -> unlock -> activate
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateBehaviorImplementation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Create a new ABAP behavior implementation class for a behavior definition. Creates the object in initial state. Use UpdateBehaviorImplementation to set implementation code afterwards.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Behavior Implementation class name (e.g., ZBP_MY_ENTITY). Must follow SAP naming conventions (typically starts with ZBP_ for behavior implementations).";
            };
            readonly behavior_definition: {
                readonly type: "string";
                readonly description: "Behavior Definition name (e.g., ZI_MY_ENTITY). The behavior definition must exist.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Class description. If not provided, class_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
        };
        readonly required: readonly ["class_name", "behavior_definition", "package_name"];
    };
};
interface CreateBehaviorImplementationArgs {
    class_name: string;
    behavior_definition: string;
    description?: string;
    package_name: string;
    transport_request?: string;
}
/**
 * Main handler for CreateBehaviorImplementation MCP tool
 *
 * Uses AdtClient.createBehaviorImplementation - full workflow
 */
export declare function handleCreateBehaviorImplementation(context: HandlerContext, args: CreateBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateBehaviorImplementation.d.ts.map