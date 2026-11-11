/**
 * UpdateBehaviorImplementation Handler - Update Existing ABAP Behavior Implementation
 *
 * Uses AdtClient from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by client.
 *
 * Workflow: lock -> update main source -> update implementations -> check -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateBehaviorImplementation";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Update source code of an existing ABAP behavior implementation class. Updates both main source (with FOR BEHAVIOR OF clause) and implementations include. Uses stateful session with proper lock/unlock mechanism.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Behavior Implementation class name (e.g., ZBP_MY_ENTITY). Must exist in the system.";
            };
            readonly behavior_definition: {
                readonly type: "string";
                readonly description: "Behavior Definition name (e.g., ZI_MY_ENTITY). Must match the behavior definition used when creating the class.";
            };
            readonly implementation_code: {
                readonly type: "string";
                readonly description: "Implementation code for the implementations include. Contains the actual behavior implementation methods.";
            };
            readonly main_source: {
                readonly type: "string";
                readonly description: "OPTIONAL full global-class source (the CLASS ... DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF ... body). Provide this ONLY when the behavior pool needs a custom PUBLIC SECTION (e.g. a public CLASS-DATA the CCIMP references). When omitted, a bare skeleton is generated (correct for most pools). When given, the global class is written via getClass().update + getLocalTypes().update instead of the skeleton-overwriting path.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Optional if object is local or already in transport.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["class_name", "behavior_definition", "implementation_code"];
    };
};
interface UpdateBehaviorImplementationArgs {
    class_name: string;
    behavior_definition: string;
    implementation_code: string;
    main_source?: string;
    transport_request?: string;
    activate?: boolean;
}
/**
 * Main handler for UpdateBehaviorImplementation MCP tool
 *
 * Uses AdtClient for all operations
 * Session and lock management handled internally by client
 */
export declare function handleUpdateBehaviorImplementation(context: HandlerContext, args: UpdateBehaviorImplementationArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateBehaviorImplementation.d.ts.map