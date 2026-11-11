import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerUpdate";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Update operation. object_type required: PACKAGE(package_name*), DOMAIN(domain_name*), DATA_ELEMENT(data_element_name*), TABLE(table_name*), STRUCTURE(structure_name*), VIEW(view_name*), SERVICE_DEFINITION(service_definition_name*), SERVICE_BINDING(service_binding_name*), CLASS(class_name*), LOCAL_TEST_CLASS(class_name*), LOCAL_TYPES(class_name*), LOCAL_DEFINITIONS(class_name*), LOCAL_MACROS(class_name*), PROGRAM(program_name*) [onprem/legacy only], INTERFACE(interface_name*), FUNCTION_GROUP(function_group_name*), FUNCTION_MODULE(function_module_name*, function_group_name*), BEHAVIOR_DEFINITION(behavior_definition_name*), BEHAVIOR_IMPLEMENTATION(behavior_implementation_name*), METADATA_EXTENSION(metadata_extension_name*), UNIT_TEST(run_id*), CDS_UNIT_TEST(run_id*).";
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
            readonly package_name: {
                readonly type: "string";
                readonly description: "ABAP package name.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "ABAP source code payload.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request id (if required by system).";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate object after update.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Human-readable object description.";
            };
            readonly datatype: {
                readonly type: "string";
                readonly description: "ABAP data type.";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "Length for typed artifacts.";
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "Decimal places.";
            };
            readonly conversion_exit: {
                readonly type: "string";
                readonly description: "Conversion exit name.";
            };
            readonly lowercase: {
                readonly type: "boolean";
                readonly description: "Allow lowercase values (domain setting).";
            };
            readonly sign_exists: {
                readonly type: "boolean";
                readonly description: "Allow signed values (domain setting).";
            };
            readonly value_table: {
                readonly type: "string";
                readonly description: "Foreign key value table.";
            };
            readonly fixed_values: {
                readonly type: "array";
                readonly description: "Domain fixed values list.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly low: {
                            readonly type: "string";
                            readonly description: "Fixed value key.";
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly description: "Fixed value text.";
                        };
                    };
                    readonly required: readonly ["low", "text"];
                };
            };
        };
        readonly required: readonly ["object_type"];
    };
};
type HandlerUpdateArgs = {
    object_type: CompactObjectType;
} & Record<string, unknown>;
export declare function handleHandlerUpdate(context: HandlerContext, args: HandlerUpdateArgs): Promise<unknown>;
export {};
//# sourceMappingURL=handleHandlerUpdate.d.ts.map