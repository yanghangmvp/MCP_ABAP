import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerCreate";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Create operation. object_type required: PACKAGE(package_name*), DOMAIN(domain_name*), DATA_ELEMENT(data_element_name*), TABLE(table_name*), STRUCTURE(structure_name*), VIEW(view_name*), SERVICE_DEFINITION(service_definition_name*), SERVICE_BINDING(service_binding_name*), CLASS(class_name*), PROGRAM(program_name*) [onprem/legacy only], INTERFACE(interface_name*), FUNCTION_GROUP(function_group_name*), FUNCTION_MODULE(function_module_name*, function_group_name*), BEHAVIOR_DEFINITION(behavior_definition_name*), BEHAVIOR_IMPLEMENTATION(behavior_implementation_name*), METADATA_EXTENSION(metadata_extension_name*), UNIT_TEST(run_id*), CDS_UNIT_TEST(run_id*).";
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
            readonly description: {
                readonly type: "string";
                readonly description: "Human-readable object description.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request id (if required by system).";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate object after create.";
            };
            readonly program_type: {
                readonly type: "string";
                readonly description: "ABAP program type.";
            };
            readonly application: {
                readonly type: "string";
                readonly description: "Domain application area.";
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
type HandlerCreateArgs = {
    object_type: CompactObjectType;
} & Record<string, unknown>;
export declare function handleHandlerCreate(context: HandlerContext, args: HandlerCreateArgs): Promise<unknown>;
export {};
//# sourceMappingURL=handleHandlerCreate.d.ts.map