"use strict";
/**
 * CreateStructure Handler - ABAP Structure Creation via ADT API
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> create -> lock -> check (inactive version) -> unlock -> (activate)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.ddlFieldType = ddlFieldType;
exports.buildStructureDdl = buildStructureDdl;
exports.handleCreateStructure = handleCreateStructure;
const adtDeletion_1 = require("../../../lib/adtDeletion");
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const transportConflict_1 = require("../../../lib/transportConflict");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateStructure',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: Structure. Will be useful for creating structure. Create a new ABAP structure in SAP system. Creates the structure object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            structure_name: {
                type: 'string',
                description: 'Structure name (e.g., ZZ_S_TEST_001). Must follow SAP naming conventions.',
            },
            description: {
                type: 'string',
                description: 'Structure description. If not provided, structure_name will be used.',
            },
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001). Required for transportable packages.',
            },
            fields: {
                type: 'array',
                description: 'Array of structure fields',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Field name (e.g., CLIENT, MATERIAL_ID)',
                        },
                        data_type: {
                            type: 'string',
                            description: 'Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.',
                        },
                        length: {
                            type: 'number',
                            description: 'Field length',
                        },
                        decimals: {
                            type: 'number',
                            description: 'Decimal places (for DEC, CURR, QUAN types)',
                            default: 0,
                        },
                        domain: {
                            type: 'string',
                            description: 'NOT SUPPORTED for a DDL structure field and rejected with an error. A DDL structure cannot type a field directly to a domain — reach the domain through a data element instead (create a DTEL on the domain, then pass it as data_element).',
                        },
                        data_element: {
                            type: 'string',
                            description: 'Data element (DTEL) to type this field with, e.g. MATNR. Takes precedence over structure_ref / table_ref / data_type.',
                        },
                        structure_ref: {
                            type: 'string',
                            description: 'NESTED substructure: types this field AS another structure (emits "<field> : <structure>;"). This is NOT an include — use the top-level "includes" parameter to flatten another structure into this one.',
                        },
                        table_ref: {
                            type: 'string',
                            description: 'Table type (TTYP) to type this field with, giving a nested internal table / line-item field (emits "<field> : <tabletype>;").',
                        },
                        description: {
                            type: 'string',
                            description: 'Field description',
                        },
                    },
                    required: ['name'],
                },
            },
            includes: {
                type: 'array',
                description: 'Include other structures in this structure',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Include structure name',
                        },
                        suffix: {
                            type: 'string',
                            description: 'Optional suffix for include fields',
                        },
                    },
                    required: ['name'],
                },
            },
            activate: {
                type: 'boolean',
                description: 'Activate structure after creation. Default: true. Set to false for batch operations (activate multiple objects later).',
            },
        },
        required: ['structure_name', 'package_name', 'fields'],
    },
};
/**
 * Map one field to its DDL type expression.
 *
 * Precedence: data_element -> structure_ref -> table_ref -> data_type builtin.
 *
 * All three REFERENCE forms used to be accepted by the inputSchema and then
 * ignored by this function, which only ever looked at `data_element` and
 * `data_type`. A field passing `table_ref: "ZTT_ITEMS"` therefore fell through
 * to the `data_type` default (CHAR) and the `length` default (1) and was
 * emitted as `abap.char(1)` — and the structure ACTIVATED, so the wrong type
 * was only discoverable by reading every field back. Nested interface
 * structures (a header with a line-item table field) are exactly the case that
 * hit this, i.e. the gap swallowed the most common real usage.
 *
 * `domain` is rejected rather than ignored: a DDL structure cannot type a field
 * to a domain at all (domains are reachable only via a data element), and
 * silently degrading to `abap.char(1)` is far worse than an explicit error.
 */
function ddlFieldType(field) {
    if (field.domain && !field.data_element) {
        throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Field "${field.name}": "domain" cannot type a DDL structure field. A structure field ` +
            `must reference a data element, another structure, a table type, or a built-in ABAP type. ` +
            `Create a data element on domain ${field.domain} and pass it as "data_element" instead.`);
    }
    if (field.data_element)
        return String(field.data_element).toLowerCase();
    if (field.structure_ref)
        return String(field.structure_ref).toLowerCase();
    if (field.table_ref)
        return String(field.table_ref).toLowerCase();
    const dt = String(field.data_type || 'CHAR').toLowerCase();
    const len = field.length;
    const dec = field.decimals ?? 0;
    // Types that carry (length, decimals) / (length) / nothing.
    const lenDecTypes = new Set(['dec', 'curr', 'quan']);
    const lenTypes = new Set(['char', 'numc', 'raw', 'cuky', 'unit']);
    if (lenDecTypes.has(dt))
        return `abap.${dt}(${len ?? 1},${dec})`;
    if (lenTypes.has(dt))
        return `abap.${dt}(${len ?? 1})`;
    return `abap.${dt}`; // int1/2/4/8, dats, tims, clnt, lang, string, ...
}
/**
 * Build DDIC structure DDL from the requested fields/includes.
 *
 * The `@AbapCatalog.enhancement.category` annotation is mandatory — without it
 * the DDL check fails. Field/structure names are lower-cased (SAP stores them
 * upper-case; DDL is case-insensitive).
 */
function buildStructureDdl(structureName, description, fields, includes) {
    const lines = [];
    for (const inc of includes ?? []) {
        if (inc?.name)
            lines.push(`  include ${inc.name.toLowerCase()};`);
    }
    for (const f of fields) {
        if (!f?.name)
            continue;
        lines.push(`  ${f.name.toLowerCase()} : ${ddlFieldType(f)};`);
    }
    const label = String(description ?? '')
        .replace(/'/g, "''")
        .slice(0, 60);
    return [
        `@EndUserText.label : '${label}'`,
        '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
        `define structure ${structureName.toLowerCase()} {`,
        ...lines,
        '}',
    ].join('\n');
}
/**
 * Main handler for CreateStructure MCP tool
 *
 * Uses StructureBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
async function handleCreateStructure(context, args) {
    const { connection, logger } = context;
    try {
        const createStructureArgs = args;
        // Validate required parameters
        if (!createStructureArgs?.structure_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Structure name is required');
        }
        if (!createStructureArgs?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        // Validate transport_request: required for non-$TMP packages
        (0, transportValidation_js_1.validateTransportRequest)(createStructureArgs.package_name, createStructureArgs.transport_request);
        if (!createStructureArgs?.fields ||
            !Array.isArray(createStructureArgs.fields) ||
            createStructureArgs.fields.length === 0) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'At least one field is required');
        }
        const structureName = createStructureArgs.structure_name.toUpperCase();
        (0, utils_1.assertNameLength)('structure', structureName, 'Structure');
        logger?.info(`Starting structure creation: ${structureName}`);
        try {
            // Get configuration from environment variables
            // Create logger for connection (only logs when DEBUG_CONNECTORS is enabled)
            // Create connection directly for this handler call
            // Get connection from session context (set by ProtocolHandler)
            // Connection is managed and cached per session, with proper token refresh via AuthBroker
            logger?.debug(`[CreateStructure] Created separate connection for handler call: ${structureName}`);
        }
        catch (connectionError) {
            const errorMessage = connectionError instanceof Error
                ? connectionError.message
                : String(connectionError);
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to create connection: ${errorMessage}`);
        }
        // Set once the object really exists in SAP, so the failure path can tell
        // "nothing was written" from "a shell was left behind".
        let createdUri;
        // What the write ACTUALLY went into — not what the caller passed.
        let transportUsed = createStructureArgs.transport_request;
        const warnings = [];
        try {
            // Create client
            const client = (0, clients_1.createAdtClient)(connection, logger);
            const shouldActivate = createStructureArgs.activate !== false; // Default to true if not specified
            let activation;
            // Validate — fail fast BEFORE create/lock/update if the name is taken.
            await (0, utils_1.assertObjectDoesNotExist)(`Structure ${structureName}`, () => client.getStructure().validate({
                structureName,
                packageName: createStructureArgs.package_name,
                description: createStructureArgs.description || structureName,
            }), connection);
            // Create
            await client.getStructure().create({
                structureName,
                description: createStructureArgs.description || structureName,
                packageName: createStructureArgs.package_name,
                ddlCode: '',
                transportRequest: createStructureArgs.transport_request,
            });
            createdUri = (0, adtObjectOps_1.buildActivationUri)(structureName, 'STRU');
            // Lock
            const lockHandle = await client.getStructure().lock({ structureName });
            try {
                // The bare create above leaves a placeholder structure
                // (component_to_be_changed). Generate DDL from the caller's fields and
                // write it via the proven update path — otherwise the fields are
                // silently dropped (the previous TODO left this unimplemented).
                const ddlCode = buildStructureDdl(structureName, createStructureArgs.description || structureName, createStructureArgs.fields, createStructureArgs.includes);
                // Follow SAP if the bare create landed in a different request than the
                // caller passed (a TASK resolves to its PARENT request) — otherwise this
                // PUT is refused and the structure is left as the placeholder shell.
                // See lib/transportConflict.
                const write = await (0, transportConflict_1.runUnderResolvedTransport)((transportRequest) => client.getStructure().update({
                    structureName,
                    ddlCode,
                    transportRequest,
                }, { lockHandle }), createStructureArgs.transport_request, `Structure ${structureName}`, logger);
                transportUsed = write.transport_used;
                if (write.warning)
                    warnings.push(write.warning);
                logger?.info(`[CreateStructure] Wrote DDL for ${createStructureArgs.fields.length} field(s): ${structureName}`);
                // Unlock (MANDATORY after lock)
                await client.getStructure().unlock({ structureName }, lockHandle);
                logger?.info(`[CreateStructure] Structure unlocked: ${structureName}`);
                // Check inactive version (after unlock)
                logger?.info(`[CreateStructure] Checking inactive version: ${structureName}`);
                try {
                    await (0, utils_1.safeCheckOperation)(() => client.getStructure().check({ structureName }, 'inactive'), structureName, {
                        debug: (message) => logger?.debug(`[CreateStructure] ${message}`),
                    });
                    logger?.info(`[CreateStructure] Inactive version check completed: ${structureName}`);
                }
                catch (checkError) {
                    // If error was marked as "already checked", continue silently
                    if (checkError.isAlreadyChecked) {
                        logger?.info(`[CreateStructure] Structure ${structureName} was already checked - this is OK, continuing`);
                    }
                    else {
                        // Log warning but don't fail - inactive check is informational
                        logger?.warn(`[CreateStructure] Inactive version check had issues: ${structureName}`, {
                            error: checkError instanceof Error
                                ? checkError.message
                                : String(checkError),
                        });
                    }
                }
                // Activate — and check what SAP actually did. The response used to be
                // discarded and the result reported `activated: shouldActivate`, i.e. the
                // caller's own request flag, so a refused activation looked successful.
                if (shouldActivate) {
                    activation = (0, adtObjectOps_1.evaluateActivationResponse)(await client.getStructure().activate({ structureName }));
                }
                if (activation && !activation.success) {
                    throw new Error(`Structure ${structureName} was written but ACTIVATION FAILED: ` +
                        `${(0, adtMessages_1.formatAdtMessages)(activation.errors)}. The object is left inactive.`);
                }
            }
            catch (error) {
                // Unlock on error (principle 1: if lock was done, unlock is mandatory)
                try {
                    await client.getStructure().unlock({ structureName }, lockHandle);
                }
                catch (unlockError) {
                    logger?.error('Failed to unlock structure after error:', unlockError);
                }
                // Principle 2: first error and exit
                throw error;
            }
            logger?.info(`✅ CreateStructure completed successfully: ${structureName}`);
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: true,
                    structure_name: structureName,
                    package_name: createStructureArgs.package_name,
                    transport_request: transportUsed || 'local',
                    ...(transportUsed !== createStructureArgs.transport_request
                        ? {
                            transport_request_requested: createStructureArgs.transport_request,
                        }
                        : {}),
                    ...(warnings.length ? { warnings } : {}),
                    // SAP's verdict, not the request flag.
                    activated: activation ? activation.activated : false,
                    message: `Structure ${structureName} created successfully${shouldActivate ? ' and activated' : ''}`,
                }),
            });
        }
        catch (error) {
            logger?.error(`Error creating structure ${structureName}:`, error);
            // Check if structure already exists
            if (error.message?.includes('already exists') ||
                error.response?.status === 409) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Structure ${structureName} already exists. Please delete it first or use a different name.`);
            }
            const errorMessage = error.response?.data
                ? typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data)
                : error.message || String(error);
            // field report round 6, F-4. The object was registered in SAP before this failed,
            // and until now it stayed there: an inactive shell that nothing reports
            // and that blocks later activations in its package. Only PRE-ACTIVATION
            // failures are cleaned up here — a failure to ACTIVATE leaves a usable
            // object on purpose, and `activateWrittenObject` already names it and
            // says what to do with it.
            const conflicting = (0, transportConflict_1.extractConflictingRequest)(error, createStructureArgs.transport_request);
            const cleanup = createdUri
                ? await (0, adtDeletion_1.removePartialCreation)(connection, {
                    objectUri: createdUri,
                    objectLabel: `structure ${structureName}`,
                    transportRequest: createStructureArgs.transport_request,
                    retryHint: conflicting
                        ? (0, transportConflict_1.describeTransportRecovery)('UpdateStructure', conflicting)
                        : undefined,
                    logger,
                })
                : '';
            throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Failed to create structure ${structureName}: ${errorMessage}${cleanup}`);
        }
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateStructure.js.map