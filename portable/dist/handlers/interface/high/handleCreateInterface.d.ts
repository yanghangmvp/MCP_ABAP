/**
 * CreateInterface Handler - ABAP Interface Creation via ADT API
 *
 * Workflow: create (object in initial state)
 * Source code is set via UpdateInterface handler.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateInterface";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: Interface. Will be useful for creating interface. Create a new ABAP interface in SAP system. Creates the interface object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name (e.g., ZIF_TEST_INTERFACE_001). Must follow SAP naming conventions (start with Z or Y).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Interface description. If not provided, interface_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LAB, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
        };
        readonly required: readonly ["interface_name", "package_name"];
    };
};
interface CreateInterfaceArgs {
    interface_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
}
export declare function handleCreateInterface(context: HandlerContext, args: CreateInterfaceArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateInterface.d.ts.map