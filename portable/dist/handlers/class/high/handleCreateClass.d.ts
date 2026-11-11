/**
 * CreateClass Handler - ABAP Class Creation via ADT API
 *
 * Workflow: validate -> create -> lock -> check (new code) -> update (if check OK) -> unlock -> check (inactive) -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Operation: Create. Subject: Class. Will be useful for creating class. Create a new ABAP class in SAP system. Creates the class object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_TEST_CLASS_001).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Class description (defaults to class_name).";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LAB, $TMP).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (required for transportable packages).";
            };
            readonly superclass: {
                readonly type: "string";
                readonly description: "Optional superclass name.";
            };
            readonly final: {
                readonly type: "boolean";
                readonly description: "Mark class as final. Default: false";
            };
            readonly abstract: {
                readonly type: "boolean";
                readonly description: "Mark class as abstract. Default: false";
            };
            readonly create_protected: {
                readonly type: "boolean";
                readonly description: "Protected constructor. Default: false";
            };
        };
        readonly required: readonly ["class_name", "package_name"];
    };
};
interface CreateClassArgs {
    class_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
    superclass?: string;
    final?: boolean;
    abstract?: boolean;
    create_protected?: boolean;
}
export declare function handleCreateClass(context: HandlerContext, params: CreateClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateClass.d.ts.map