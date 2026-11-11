import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerDelete";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Delete operation. object_type required: PACKAGE(package_name*), DOMAIN(domain_name*), DATA_ELEMENT(data_element_name*), TABLE(table_name*), STRUCTURE(structure_name*), VIEW(view_name*), SERVICE_DEFINITION(service_definition_name*), SERVICE_BINDING(service_binding_name*), CLASS(class_name*), LOCAL_TEST_CLASS(class_name*), LOCAL_TYPES(class_name*), LOCAL_DEFINITIONS(class_name*), LOCAL_MACROS(class_name*), PROGRAM(program_name*) [onprem/legacy only], INTERFACE(interface_name*), FUNCTION_GROUP(function_group_name*), FUNCTION_MODULE(function_module_name*, function_group_name*), BEHAVIOR_DEFINITION(behavior_definition_name*), BEHAVIOR_IMPLEMENTATION(behavior_implementation_name*), METADATA_EXTENSION(metadata_extension_name*), UNIT_TEST(run_id*), CDS_UNIT_TEST(run_id*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly enum: CompactObjectType[];
                readonly description: "ABAP object type for routed compact operation.";
            };
            readonly class_name: {
                readonly type: "string";
                readonly description: "ABAP class name.";
            };
            readonly program_name: {
                readonly type: "string";
                readonly description: "ABAP program name.";
            };
            readonly domain_name: {
                readonly type: "string";
                readonly description: "ABAP domain name.";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "ABAP function module name.";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "ABAP function group name.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request id (if required by system).";
            };
        };
        readonly required: readonly ["object_type"];
    };
};
type HandlerDeleteArgs = {
    object_type: CompactObjectType;
} & Record<string, unknown>;
export declare function handleHandlerDelete(context: HandlerContext, args: HandlerDeleteArgs): Promise<unknown>;
export {};
//# sourceMappingURL=handleHandlerDelete.d.ts.map