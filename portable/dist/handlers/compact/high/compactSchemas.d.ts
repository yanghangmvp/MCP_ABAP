export declare const compactCreateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
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
export declare const compactGetSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
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
export declare const compactUpdateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
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
export declare const compactDeleteSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
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
export declare const compactUnitTestRunSchema: {
    readonly type: "object";
    readonly properties: {
        readonly tests: {
            readonly type: "array";
            readonly description: "List of test classes to run.";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly container_class: {
                        readonly type: "string";
                        readonly description: "Productive class containing tests.";
                    };
                    readonly test_class: {
                        readonly type: "string";
                        readonly description: "Local/unit test class.";
                    };
                };
                readonly required: readonly ["container_class", "test_class"];
            };
        };
        readonly title: {
            readonly type: "string";
            readonly description: "Run title shown in ABAP Unit logs.";
        };
        readonly context: {
            readonly type: "string";
            readonly description: "Run context label.";
        };
        readonly scope: {
            readonly type: "object";
            readonly description: "ABAP Unit scope flags.";
            readonly properties: {
                readonly own_tests: {
                    readonly type: "boolean";
                    readonly description: "Include own tests.";
                };
                readonly foreign_tests: {
                    readonly type: "boolean";
                    readonly description: "Include foreign tests.";
                };
                readonly add_foreign_tests_as_preview: {
                    readonly type: "boolean";
                    readonly description: "Preview foreign tests without full inclusion.";
                };
            };
        };
        readonly risk_level: {
            readonly type: "object";
            readonly description: "Allowed risk levels.";
            readonly properties: {
                readonly harmless: {
                    readonly type: "boolean";
                    readonly description: "Allow harmless tests.";
                };
                readonly dangerous: {
                    readonly type: "boolean";
                    readonly description: "Allow dangerous tests.";
                };
                readonly critical: {
                    readonly type: "boolean";
                    readonly description: "Allow critical tests.";
                };
            };
        };
        readonly duration: {
            readonly type: "object";
            readonly description: "Allowed duration classes.";
            readonly properties: {
                readonly short: {
                    readonly type: "boolean";
                    readonly description: "Allow short tests.";
                };
                readonly medium: {
                    readonly type: "boolean";
                    readonly description: "Allow medium tests.";
                };
                readonly long: {
                    readonly type: "boolean";
                    readonly description: "Allow long tests.";
                };
            };
        };
    };
    readonly required: readonly ["tests"];
};
export declare const compactUnitTestStatusSchema: {
    readonly type: "object";
    readonly properties: {
        readonly run_id: {
            readonly type: "string";
            readonly description: "Unit test run id.";
        };
        readonly with_long_polling: {
            readonly type: "boolean";
            readonly default: true;
            readonly description: "Use long polling while waiting for completion.";
        };
    };
    readonly required: readonly ["run_id"];
};
export declare const compactUnitTestResultSchema: {
    readonly type: "object";
    readonly properties: {
        readonly run_id: {
            readonly type: "string";
            readonly description: "Unit test run id.";
        };
        readonly with_navigation_uris: {
            readonly type: "boolean";
            readonly default: false;
            readonly description: "Include ADT navigation URIs in the result payload.";
        };
        readonly format: {
            readonly type: "string";
            readonly enum: readonly ["abapunit", "junit"];
            readonly description: "Result format.";
        };
    };
    readonly required: readonly ["run_id"];
};
export declare const compactCdsUnitTestStatusSchema: {
    readonly type: "object";
    readonly properties: {
        readonly run_id: {
            readonly type: "string";
            readonly description: "Unit test run id.";
        };
        readonly with_long_polling: {
            readonly type: "boolean";
            readonly default: true;
            readonly description: "Use long polling while waiting for completion.";
        };
    };
    readonly required: readonly ["run_id"];
};
export declare const compactCdsUnitTestResultSchema: {
    readonly type: "object";
    readonly properties: {
        readonly run_id: {
            readonly type: "string";
            readonly description: "Unit test run id.";
        };
        readonly with_navigation_uris: {
            readonly type: "boolean";
            readonly default: false;
            readonly description: "Include ADT navigation URIs in the result payload.";
        };
        readonly format: {
            readonly type: "string";
            readonly enum: readonly ["abapunit", "junit"];
            readonly description: "Result format.";
        };
    };
    readonly required: readonly ["run_id"];
};
export declare const compactProfileRunSchema: {
    readonly type: "object";
    readonly properties: {
        readonly target_type: {
            readonly type: "string";
            readonly enum: readonly ["CLASS", "PROGRAM"];
            readonly description: "Profile execution target kind.";
        };
        readonly class_name: {
            readonly type: "string";
            readonly description: "Class name for profiling.";
        };
        readonly program_name: {
            readonly type: "string";
            readonly description: "Program name for profiling.";
        };
        readonly description: {
            readonly type: "string";
            readonly description: "Profiler run description.";
        };
        readonly all_procedural_units: {
            readonly type: "boolean";
            readonly description: "Trace all procedural units.";
        };
        readonly all_misc_abap_statements: {
            readonly type: "boolean";
            readonly description: "Trace miscellaneous ABAP statements.";
        };
        readonly all_internal_table_events: {
            readonly type: "boolean";
            readonly description: "Trace internal table events.";
        };
        readonly all_dynpro_events: {
            readonly type: "boolean";
            readonly description: "Trace dynpro events.";
        };
        readonly aggregate: {
            readonly type: "boolean";
            readonly description: "Aggregate profiling data.";
        };
        readonly explicit_on_off: {
            readonly type: "boolean";
            readonly description: "Use explicit on/off trace sections.";
        };
        readonly with_rfc_tracing: {
            readonly type: "boolean";
            readonly description: "Enable RFC tracing.";
        };
        readonly all_system_kernel_events: {
            readonly type: "boolean";
            readonly description: "Trace system kernel events.";
        };
        readonly sql_trace: {
            readonly type: "boolean";
            readonly description: "Enable SQL trace.";
        };
        readonly all_db_events: {
            readonly type: "boolean";
            readonly description: "Trace all DB events.";
        };
        readonly max_size_for_trace_file: {
            readonly type: "number";
            readonly description: "Maximum trace file size.";
        };
        readonly amdp_trace: {
            readonly type: "boolean";
            readonly description: "Enable AMDP tracing.";
        };
        readonly max_time_for_tracing: {
            readonly type: "number";
            readonly description: "Maximum tracing time.";
        };
    };
    readonly required: readonly ["target_type"];
};
export declare const compactProfileListSchema: {
    readonly type: "object";
    readonly properties: {};
    readonly required: readonly [];
};
export declare const compactProfileViewSchema: {
    readonly type: "object";
    readonly properties: {
        readonly trace_id_or_uri: {
            readonly type: "string";
            readonly description: "Profiler trace id or URI.";
        };
        readonly view: {
            readonly type: "string";
            readonly enum: readonly ["hitlist", "statements", "db_accesses"];
            readonly description: "Profiler trace view kind.";
        };
        readonly with_system_events: {
            readonly type: "boolean";
            readonly description: "Include system events in analysis.";
        };
        readonly id: {
            readonly type: "number";
            readonly description: "Optional statement/access id.";
        };
        readonly with_details: {
            readonly type: "boolean";
            readonly description: "Include detailed payload.";
        };
        readonly auto_drill_down_threshold: {
            readonly type: "number";
            readonly description: "Auto drill-down threshold.";
        };
    };
    readonly required: readonly ["trace_id_or_uri", "view"];
};
export declare const compactDumpListSchema: {
    readonly type: "object";
    readonly properties: {
        readonly user: {
            readonly type: "string";
            readonly description: "Filter dumps by user.";
        };
        readonly top: {
            readonly type: "number";
            readonly description: "Limit number of returned dumps.";
        };
        readonly from: {
            readonly type: "string";
            readonly description: "Start of time range (YYYYMMDDHHMMSS).";
        };
        readonly to: {
            readonly type: "string";
            readonly description: "End of time range (YYYYMMDDHHMMSS).";
        };
    };
    readonly required: readonly [];
};
export declare const compactDumpViewSchema: {
    readonly type: "object";
    readonly properties: {
        readonly dump_id: {
            readonly type: "string";
            readonly description: "Runtime dump id.";
        };
        readonly view: {
            readonly type: "string";
            readonly enum: readonly ["default", "summary", "formatted"];
            readonly default: "default";
            readonly description: "Dump rendering mode.";
        };
    };
    readonly required: readonly ["dump_id"];
};
export declare const compactServiceBindingListTypesSchema: {
    readonly type: "object";
    readonly properties: {
        readonly response_format: {
            readonly type: "string";
            readonly enum: readonly ["xml", "json", "plain"];
            readonly default: "xml";
            readonly description: "Response format for protocol types list.";
        };
    };
    readonly required: readonly [];
};
export declare const compactServiceBindingValidateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly service_binding_name: {
            readonly type: "string";
            readonly description: "Service binding name to validate.";
        };
        readonly service_definition_name: {
            readonly type: "string";
            readonly description: "Service definition name to pair with binding.";
        };
        readonly service_binding_version: {
            readonly type: "string";
            readonly description: "Service binding version.";
        };
        readonly package_name: {
            readonly type: "string";
            readonly description: "Target package name.";
        };
        readonly description: {
            readonly type: "string";
            readonly description: "Binding description.";
        };
    };
    readonly required: readonly ["service_binding_name", "service_definition_name"];
};
export declare const compactTransportCreateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly transport_type: {
            readonly type: "string";
            readonly enum: readonly ["workbench", "customizing"];
            readonly default: "workbench";
            readonly description: "Transport type.";
        };
        readonly description: {
            readonly type: "string";
            readonly description: "Transport description.";
        };
        readonly target_system: {
            readonly type: "string";
            readonly description: "Target system id.";
        };
        readonly owner: {
            readonly type: "string";
            readonly description: "Transport owner user.";
        };
    };
    readonly required: readonly ["description"];
};
export declare const compactValidateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: readonly ["CLASS", "PROGRAM", "INTERFACE", "FUNCTION_GROUP", "FUNCTION_MODULE", "TABLE", "STRUCTURE", "VIEW", "DOMAIN", "DATA_ELEMENT", "PACKAGE", "BEHAVIOR_DEFINITION", "BEHAVIOR_IMPLEMENTATION", "METADATA_EXTENSION", "SERVICE_BINDING"];
            readonly description: "Object type to validate before create. Supported: CLASS, PROGRAM, INTERFACE, FUNCTION_GROUP, FUNCTION_MODULE, TABLE, STRUCTURE, VIEW, DOMAIN, DATA_ELEMENT, PACKAGE, BEHAVIOR_DEFINITION, BEHAVIOR_IMPLEMENTATION, METADATA_EXTENSION, SERVICE_BINDING.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Required object name. For SERVICE_BINDING this is the service binding name.";
        };
        readonly package_name: {
            readonly type: "string";
            readonly description: "Optional package context for validation (especially for create scenarios).";
        };
        readonly description: {
            readonly type: "string";
            readonly description: "Optional object description used during validation.";
        };
        readonly behavior_definition: {
            readonly type: "string";
            readonly description: "Optional behavior definition name, used when validating behavior implementation.";
        };
        readonly root_entity: {
            readonly type: "string";
            readonly description: "Optional CDS root entity name, used for behavior-related validation.";
        };
        readonly implementation_type: {
            readonly type: "string";
            readonly description: "Optional implementation type, used for behavior implementation validation.";
        };
        readonly service_definition_name: {
            readonly type: "string";
            readonly description: "Required when object_type=SERVICE_BINDING. Service definition paired with the binding.";
        };
        readonly service_binding_version: {
            readonly type: "string";
            readonly description: "Optional service binding version for SERVICE_BINDING.";
        };
        readonly session_id: {
            readonly type: "string";
            readonly description: "Optional ADT session id for stateful validation flow.";
        };
        readonly session_state: {
            readonly type: "object";
            readonly description: "Optional ADT session state container (cookies/CSRF) for stateful validation flow.";
            readonly properties: {
                readonly cookies: {
                    readonly type: "string";
                    readonly description: "Serialized Cookie header to reuse server session.";
                };
                readonly csrf_token: {
                    readonly type: "string";
                    readonly description: "CSRF token to reuse server session.";
                };
                readonly cookie_store: {
                    readonly type: "object";
                    readonly description: "Cookie key/value map to reuse server session.";
                };
            };
        };
    };
    readonly required: readonly ["object_type", "object_name"];
};
export declare const compactLockSchema: {
    readonly type: "object";
    readonly properties: {
        readonly super_package: {
            readonly type: "string";
            readonly description: "Super package context when relevant.";
        };
        readonly session_id: {
            readonly type: "string";
            readonly description: "Optional ADT session id for stateful lock flow.";
        };
        readonly session_state: {
            readonly type: "object";
            readonly description: "Optional ADT session state container (cookies/CSRF) for stateful lock flow.";
            readonly properties: {
                readonly cookies: {
                    readonly type: "string";
                    readonly description: "Serialized Cookie header to reuse server session.";
                };
                readonly csrf_token: {
                    readonly type: "string";
                    readonly description: "CSRF token to reuse server session.";
                };
                readonly cookie_store: {
                    readonly type: "object";
                    readonly description: "Cookie key/value map to reuse server session.";
                };
            };
        };
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
            readonly description: "ABAP object type for routed compact operation.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Primary object name for lifecycle operation.";
        };
    };
    readonly required: readonly ["object_type", "object_name"];
};
export declare const compactUnlockSchema: {
    readonly type: "object";
    readonly properties: {
        readonly lock_handle: {
            readonly type: "string";
            readonly description: "Lock handle returned by lock.";
        };
        readonly session_id: {
            readonly type: "string";
            readonly description: "ADT session id used during lock.";
        };
        readonly session_state: {
            readonly type: "object";
            readonly description: "Optional ADT session state container (cookies/CSRF) for stateful unlock flow.";
            readonly properties: {
                readonly cookies: {
                    readonly type: "string";
                    readonly description: "Serialized Cookie header to reuse server session.";
                };
                readonly csrf_token: {
                    readonly type: "string";
                    readonly description: "CSRF token to reuse server session.";
                };
                readonly cookie_store: {
                    readonly type: "object";
                    readonly description: "Cookie key/value map to reuse server session.";
                };
            };
        };
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
            readonly description: "ABAP object type for routed compact operation.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Primary object name for lifecycle operation.";
        };
    };
    readonly required: readonly ["object_type", "object_name", "lock_handle", "session_id"];
};
export declare const compactCheckRunSchema: {
    readonly type: "object";
    readonly properties: {
        readonly version: {
            readonly type: "string";
            readonly enum: readonly ["active", "inactive"];
            readonly default: "active";
            readonly description: "Version to syntax-check.";
        };
        readonly session_id: {
            readonly type: "string";
            readonly description: "Optional ADT session id for stateful check flow.";
        };
        readonly session_state: {
            readonly type: "object";
            readonly description: "Optional ADT session state container (cookies/CSRF) for stateful check flow.";
            readonly properties: {
                readonly cookies: {
                    readonly type: "string";
                    readonly description: "Serialized Cookie header to reuse server session.";
                };
                readonly csrf_token: {
                    readonly type: "string";
                    readonly description: "CSRF token to reuse server session.";
                };
                readonly cookie_store: {
                    readonly type: "object";
                    readonly description: "Cookie key/value map to reuse server session.";
                };
            };
        };
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
            readonly description: "ABAP object type for routed compact operation.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Primary object name for lifecycle operation.";
        };
    };
    readonly required: readonly ["object_type", "object_name"];
};
export declare const compactActivateSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: import("./compactObjectTypes").CompactObjectType[];
            readonly description: "ABAP object type for routed compact operation.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Object name for single-object activation form.";
        };
        readonly object_adt_type: {
            readonly type: "string";
            readonly description: "ADT object type code (e.g. CLAS/OC, PROG/P). Required for single-object activation form.";
        };
        readonly objects: {
            readonly type: "array";
            readonly description: "Explicit objects list for batch activation.";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "Object name.";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly description: "ADT object type code.";
                    };
                    readonly uri: {
                        readonly type: "string";
                        readonly description: "Optional ADT object URI.";
                    };
                };
                readonly required: readonly ["name", "type"];
            };
        };
        readonly preaudit: {
            readonly type: "boolean";
            readonly description: "Run pre-audit checks before activation.";
        };
    };
};
/**
 * field report round 7, F-9 — the analysis set.
 *
 * The compact facade covered 26 object types and the CRUD/activate/check matrix
 * over them, and nothing else. Measured against one real project's transcript,
 * that left **748 of 1,922 calls (38 %) unreachable** — `GetSqlQuery` 323,
 * `RuntimeRunProgram` 80, `RunAtc` 65, `SearchSource` 55, `SearchObject` 32,
 * `GetInactiveObjects` 26, and so on.
 *
 * `GetInactiveObjects` is the one that decided it: it is the only step in that
 * project's process that does not take a tool's word for anything, and after the
 * activation-verdict defects (K-1) it appears in every round-closing procedure
 * they run. A facade that cannot run the sweep cannot be the default for a
 * project that needs the sweep.
 *
 * Four routed operations plus two tools kept as themselves, rather than
 * relaxing `validateExposition` to allow `compact,readonly` — that would have
 * been three lines and would have put the whole ~17,700-token readonly schema
 * surface back on the wire, which is the cost compact exists to avoid.
 */
export declare const compactQuerySchema: {
    readonly type: "object";
    readonly properties: {
        readonly operation: {
            readonly type: "string";
            readonly enum: readonly ["sql", "table"];
            readonly description: "'sql' runs a SELECT; 'table' reads one table's rows.";
        };
        readonly sql_query: {
            readonly type: "string";
            readonly description: "Required for operation='sql'. One SELECT statement.";
        };
        readonly table_name: {
            readonly type: "string";
            readonly description: "Required for operation='table'.";
        };
        readonly max_rows: {
            readonly type: "number";
            readonly description: "Row cap. Default 100.";
        };
    };
    readonly required: readonly ["operation"];
};
export declare const compactSearchSchema: {
    readonly type: "object";
    readonly properties: {
        readonly operation: {
            readonly type: "string";
            readonly enum: readonly ["object", "source", "where_used"];
            readonly description: "'object' finds objects by name; 'source' scans source text inside packages (onprem only); 'where_used' lists references to one object.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Required for operation='object' and 'where_used'.";
        };
        readonly object_type: {
            readonly type: "string";
            readonly description: "Object type. Required for operation='where_used' (e.g. 'class', 'table').";
        };
        readonly query: {
            readonly type: "string";
            readonly description: "Required for operation='source'. Substring to match.";
        };
        readonly packages: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly description: "Required for operation='source'. PACKAGE names (not object names), e.g. [\"$TMP\"]. Narrow this — it is what makes the scan fast.";
        };
        readonly max_results: {
            readonly type: "number";
            readonly description: "Result cap.";
        };
    };
    readonly required: readonly ["operation"];
};
export declare const compactAtcSchema: {
    readonly type: "object";
    readonly properties: {
        readonly operation: {
            readonly type: "string";
            readonly enum: readonly ["run", "worklist", "customizing"];
            readonly description: "'run' executes a check; 'worklist' re-reads a previous run by id; 'customizing' reports the system's ATC configuration.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "For operation='run'.";
        };
        readonly object_type: {
            readonly type: "string";
            readonly description: "For operation='run', e.g. 'package', 'class'.";
        };
        readonly check_variant: {
            readonly type: "string";
            readonly description: "Check variant name. Verified against SCICHKV_HD; an unknown name is refused rather than silently replaced by DEFAULT.";
        };
        readonly max_priority: {
            readonly type: "number";
            readonly description: "Highest priority to report.";
        };
        readonly summary: {
            readonly type: "boolean";
            readonly description: "Counts only.";
        };
        readonly worklist_id: {
            readonly type: "string";
            readonly description: "Required for operation='worklist'.";
        };
    };
    readonly required: readonly ["operation"];
};
export declare const compactRuntimeSchema: {
    readonly type: "object";
    readonly properties: {
        readonly object_type: {
            readonly type: "string";
            readonly enum: readonly ["program", "class"];
            readonly description: "'program' runs a report (onprem only); 'class' runs a class implementing IF_OO_ADT_CLASSRUN.";
        };
        readonly object_name: {
            readonly type: "string";
            readonly description: "Program or class name.";
        };
        readonly profile: {
            readonly type: "boolean";
            readonly description: "Run with the profiler.";
        };
        readonly description: {
            readonly type: "string";
            readonly description: "Trace description.";
        };
    };
    readonly required: readonly ["object_type", "object_name"];
};
export declare const compactInactiveSchema: {
    readonly type: "object";
    readonly properties: {
        readonly name_prefix: {
            readonly type: "string";
            readonly description: "Only objects whose name starts with this.";
        };
        readonly object_type: {
            readonly type: "string";
            readonly description: "Only this ADT type, e.g. 'CLAS/OC'.";
        };
    };
    readonly required: readonly [];
};
//# sourceMappingURL=compactSchemas.d.ts.map