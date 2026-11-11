import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerGet";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Read operation. object_type required: PACKAGE(package_name*), DOMAIN(domain_name*), DATA_ELEMENT(data_element_name*), TABLE(table_name*), STRUCTURE(structure_name*), VIEW(view_name*), SERVICE_DEFINITION(service_definition_name*), SERVICE_BINDING(service_binding_name*), CLASS(class_name*), LOCAL_TEST_CLASS(class_name*), LOCAL_TYPES(class_name*), LOCAL_DEFINITIONS(class_name*), LOCAL_MACROS(class_name*), PROGRAM(program_name*) [onprem/legacy only], INTERFACE(interface_name*), FUNCTION_GROUP(function_group_name*), FUNCTION_MODULE(function_module_name*, function_group_name*), BEHAVIOR_DEFINITION(behavior_definition_name*), BEHAVIOR_IMPLEMENTATION(behavior_implementation_name*), METADATA_EXTENSION(metadata_extension_name*), UNIT_TEST(run_id*), CDS_UNIT_TEST(run_id*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly enum: CompactObjectType[];
                readonly description: "ABAP object type for routed compact operation.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name.";
            };
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name.";
            };
            readonly interface_name: {
                readonly type: "string";
                readonly description: "Interface name.";
            };
            readonly program_name: {
                readonly type: "string";
                readonly description: "Program name.";
            };
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name.";
            };
            readonly data_element_name: {
                readonly type: "string";
                readonly description: "Data element name.";
            };
            readonly table_name: {
                readonly type: "string";
                readonly description: "Table name.";
            };
            readonly structure_name: {
                readonly type: "string";
                readonly description: "Structure name.";
            };
            readonly view_name: {
                readonly type: "string";
                readonly description: "View name.";
            };
            readonly function_module_name: {
                readonly type: "string";
                readonly description: "Function module name.";
            };
            readonly function_group_name: {
                readonly type: "string";
                readonly description: "Function group name.";
            };
            readonly behavior_definition_name: {
                readonly type: "string";
                readonly description: "Behavior definition name.";
            };
            readonly behavior_implementation_name: {
                readonly type: "string";
                readonly description: "Behavior implementation name.";
            };
            readonly metadata_extension_name: {
                readonly type: "string";
                readonly description: "Metadata extension name.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition name.";
            };
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name.";
            };
            readonly run_id: {
                readonly type: "string";
                readonly description: "Unit test run id.";
            };
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly description: "Response format for SERVICE_BINDING reads.";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly default: "active";
                readonly description: "Object version to read/check.";
            };
        };
        readonly required: readonly ["object_type"];
    };
};
type HandlerGetArgs = {
    object_type: CompactObjectType;
} & Record<string, unknown>;
export declare function handleHandlerGet(context: HandlerContext, args: HandlerGetArgs): Promise<unknown>;
export {};
//# sourceMappingURL=handleHandlerGet.d.ts.map