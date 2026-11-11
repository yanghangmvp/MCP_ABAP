/**
 * GenerateRepoObjects Handler — drive an SAP ADT repository generator.
 *
 * The repository generators under `/sap/bc/adt/repository/generators` create
 * whole bundles of ABAP artifacts from a single DB-table reference. Three
 * generator types are exposed:
 *
 *   - "uiservice"     — full RAP OData UI service  (CDS root + BDEF + behavior
 *                       pool + draft table + projection + service definition +
 *                       service binding + metadata extension)
 *   - "webapiservice" — same, but OData Web API variant (no UI specifics)
 *   - "smbc"          — Fiori-based maintenance object for a customizing table
 *
 * For all three the generator endpoint is reached with a POST carrying the
 * JSON `Content-Type` from the user spec; the response is an
 * `<adtcore:objectReferences>` XML body pointing at the created artifacts.
 * For uiservice / webapiservice we then follow up with a GET on the SRVB
 * reference and include its parsed payload alongside the list of generated
 * objects, so callers get a verified view of the binding's state.
 *
 * The /sap/bc/adt/repository/generators/<type>?referencedObject=… endpoint
 * has no wrapper in @mcp-abap-adt/adt-clients — this handler talks straight
 * to ADT, mirroring the handleReleaseTransport / handleSetTransportOwner
 * direct-REST pattern.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
declare const VALID_TYPES: readonly ["uiservice", "webapiservice", "smbc"];
type GeneratorType = (typeof VALID_TYPES)[number];
declare const BINDING_TYPE_UI_V4 = "OData V4 - UI";
declare const BINDING_TYPE_WEBAPI_V4 = "OData V4";
declare const BINDING_TYPE_UI_V2 = "OData V2 - UI";
declare const BINDING_TYPE_WEBAPI_V2 = "OData V2";
export declare const TOOL_DEFINITION: {
    readonly name: "GenerateRepoObjects";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Generate a full repository bundle from one DB table using SAP ADT repository generators. Supported types: \"uiservice\" (OData V4 UI service via RAP — CDS root + BDEF + behavior pool + draft table + projection + service definition + service binding + metadata extension), \"webapiservice\" (parallel RAP Web API service — no UI specifics), \"smbc\" (Fiori-based maintenance object for a customizing table). For uiservice / webapiservice the created service binding is fetched and returned alongside the list of generated objects.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["uiservice", "webapiservice", "smbc"];
                readonly description: "Which generator to invoke.";
            };
            readonly reference_object_name: {
                readonly type: "string";
                readonly description: "Name of the source DB table (e.g. \"ZLEAVE_R2\"). The referencedObject query parameter sent to SAP is built as /sap/bc/adt/ddic/tables/<name>.";
            };
            readonly package: {
                readonly type: "string";
                readonly description: "Target ABAP package for the generated objects (e.g. \"$TMP\" or \"ZLEAVE\").";
            };
            readonly master_language: {
                readonly type: "string";
                readonly description: "Master language for new objects (e.g. \"EN\").";
                readonly default: "EN";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description applied to the generated objects.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Optional CTS transport request (forwarded as corrNr query parameter). Leave empty for $TMP / local packages.";
            };
            readonly cds_name: {
                readonly type: "string";
                readonly description: "Root CDS view name (e.g. \"ZR_LEAVE_R23\"). Required for uiservice / webapiservice.";
            };
            readonly behavior_implementation_class: {
                readonly type: "string";
                readonly description: "Behavior implementation class (e.g. \"ZBP_LEAVE_R23\"). Required for uiservice / webapiservice.";
            };
            readonly draft_table: {
                readonly type: "string";
                readonly description: "Draft table name for the root entity (uiservice only; ignored for webapiservice).";
            };
            readonly service_projection_name: {
                readonly type: "string";
                readonly description: "Service projection name (e.g. \"ZC_LEAVE_R23\"). Required for uiservice / webapiservice.";
            };
            readonly service_definition_name: {
                readonly type: "string";
                readonly description: "Service definition name (e.g. \"ZUI_LEAVE_R2_O43\"). Required for uiservice / webapiservice.";
            };
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name (e.g. \"ZUI_LEAVE_R2_O43\"). Required for uiservice / webapiservice.";
            };
            readonly service_binding_type: {
                readonly type: "string";
                readonly enum: readonly ["OData V4 - UI", "OData V4", "OData V2 - UI", "OData V2"];
                readonly description: "Binding type. Defaults to \"OData V4 - UI\" for uiservice and \"OData V4\" for webapiservice.";
            };
            readonly maintenance_object_name: {
                readonly type: "string";
                readonly description: "Maintenance object name (e.g. \"ZMO_LEAVE_R2\"). Required for smbc.";
            };
            readonly smbc_description: {
                readonly type: "string";
                readonly description: "Description specifically for the maintenance object (smbc only; falls back to the top-level `description`).";
            };
        };
        readonly required: readonly ["type", "reference_object_name", "package"];
    };
};
export interface GenerateRepoObjectsArgs {
    type: GeneratorType;
    reference_object_name: string;
    package: string;
    master_language?: string;
    description?: string;
    transport_request?: string;
    cds_name?: string;
    behavior_implementation_class?: string;
    draft_table?: string;
    service_projection_name?: string;
    service_definition_name?: string;
    service_binding_name?: string;
    service_binding_type?: typeof BINDING_TYPE_UI_V4 | typeof BINDING_TYPE_WEBAPI_V4 | typeof BINDING_TYPE_UI_V2 | typeof BINDING_TYPE_WEBAPI_V2;
    maintenance_object_name?: string;
    smbc_description?: string;
}
/** Compose the JSON body for uiservice / webapiservice generators. */
export declare function composeUiServiceBody(args: GenerateRepoObjectsArgs, defaultBindingType: string): Record<string, unknown>;
/**
 * Compose the JSON body for the smbc (maintenance object) generator.
 *
 * NOTE: the exact body shape for the BCT maintenance-object generator is not
 * publicly documented; this is a best-guess shape that mirrors the BCT family
 * convention. If the live POST 4xxes, the integration test on DM2 will surface
 * SAP's real expected body — adjust this function to match.
 */
export declare function composeSmbcBody(args: GenerateRepoObjectsArgs): Record<string, unknown>;
/** Pick the right composer for the given type. */
export declare function composeGeneratorBody(args: GenerateRepoObjectsArgs): Record<string, unknown>;
export interface GeneratorObjectRef {
    uri: string | null;
    type: string | null;
    name: string | null;
    meta: Record<string, string | undefined>;
}
/**
 * Parse an `<adtcore:objectReferences>` response body into a normalized array.
 * `removeNSPrefix: true` collapses `adtcore:` prefixes — both `objectReferences`
 * and the per-attribute prefix fall back to plain attribute names.
 */
export declare function parseObjectReferences(xmlText: string): {
    references: GeneratorObjectRef[];
    raw: any;
};
/** Find the SRVB reference (priority: name match → type contains SRVB → first). */
export declare function pickServiceBindingRef(refs: GeneratorObjectRef[], expectedName?: string): GeneratorObjectRef | undefined;
export interface ValidationError {
    field: string;
    message: string;
}
/**
 * Validate the incoming args; returns a list of errors (empty = OK).
 * Exported so unit tests can exercise per-type rules without the network.
 */
export declare function validateArgs(args: GenerateRepoObjectsArgs | undefined | null): ValidationError[] | string;
export declare function handleGenerateRepoObjects(context: HandlerContext, args: GenerateRepoObjectsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGenerateRepoObjects.d.ts.map