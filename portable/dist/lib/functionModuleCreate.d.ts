/**
 * Function module creation — in-repo bypass of the adt-clients dep.
 *
 * WHY: two reasons, one of them blocking.
 *
 * 1. THE PROCESSING TYPE CANNOT BE SET. The dep's `core/functionModule/create.js`
 *    emits only description/name/type plus the containerRef, so every function
 *    module it creates is a plain NORMAL module. A V1 **update module** — the
 *    kind called with `CALL FUNCTION ... IN UPDATE TASK` and whose failure is
 *    what makes `COMMIT WORK AND WAIT` report `sy-subrc <> 0` — could therefore
 *    not be created through this MCP at all, so a test asserting that behaviour
 *    could not be written.
 *
 *    The attributes exist and are plainly visible on SAP's own modules. Read
 *    live from DM2/310 (S/4HANA 2023 FPS02) and cross-checked against TFDIR:
 *
 *      processingType | updateTaskKind           | TFDIR-UTASK | SE37 radio button
 *      ---------------+--------------------------+-------------+---------------------------
 *      normal         | (absent)                 | ''          | Normal Function Module
 *      rfc            | (absent)                 | '' (FMODE=R)| Remote-Enabled Module
 *      update         | startImmediate           | '1'         | Update Module, Start Immed.
 *      update         | startDelayed             | '2'         | Update Module, Start Delayed
 *      update         | immediateStartNoRestart  | '3'         | Imm. Start, No Restart
 *
 *    Each row was verified by reading a real module with that UTASK value, e.g.
 *    PPH_MRP_AREA_CREATE_DATA (UTASK '1') answers
 *    `fmodule:processingType="update" fmodule:updateTaskKind="startImmediate"`.
 *    Note UTASK '3' is `immediateStartNoRestart`, and a remote-enabled module is
 *    `processingType="rfc"` with UTASK left blank — neither is guessable.
 *
 * 2. THE DESCRIPTION IS INTERPOLATED UNESCAPED, exactly like the function-group
 *    create that produced a blanket `Bad request: Data is invalid and could not
 *    be converted` for any description containing an XML metacharacter. Every
 *    value here is escaped.
 */
import type { IAbapConnection } from '@mcp-abap-adt/interfaces';
import { type AxiosResponse } from './utils';
export declare const CT_FUNCTION_MODULE = "application/vnd.sap.adt.functions.fmodules.v2+xml";
/**
 * The ONLY media type that accepts a metadata PUT on this collection. Measured:
 * v2 and v1 answer 415 `ExceptionUnsupportedMediaType`, v3 answers 200 and the
 * attributes are stored.
 */
export declare const CT_FUNCTION_MODULE_V3 = "application/vnd.sap.adt.functions.fmodules.v3+xml";
/**
 * The processing types a caller can ask for, mapped to the two ADT attributes.
 * `undefined` updateTaskKind means the attribute is omitted entirely, which is
 * how SAP's own non-update modules look.
 */
export declare const FUNCTION_MODULE_PROCESSING_TYPES: {
    readonly normal: {
        readonly processingType: "normal";
        readonly updateTaskKind: undefined;
    };
    readonly remote: {
        readonly processingType: "rfc";
        readonly updateTaskKind: undefined;
    };
    readonly update_start_immediate: {
        readonly processingType: "update";
        readonly updateTaskKind: "startImmediate";
    };
    readonly update_start_delayed: {
        readonly processingType: "update";
        readonly updateTaskKind: "startDelayed";
    };
    readonly update_immediate_no_restart: {
        readonly processingType: "update";
        readonly updateTaskKind: "immediateStartNoRestart";
    };
};
export type FunctionModuleProcessingType = keyof typeof FUNCTION_MODULE_PROCESSING_TYPES;
export interface FunctionModuleCreateParams {
    functionModuleName: string;
    functionGroupName: string;
    description?: string;
    processingType?: FunctionModuleProcessingType;
    masterSystem?: string;
    responsible?: string;
    transportRequest?: string;
}
/**
 * Build the function module create body with every interpolated value ESCAPED
 * and the processing type applied. Exported for unit testing.
 */
export declare function buildFunctionModuleCreateXml(params: FunctionModuleCreateParams): string;
/**
 * POST the function module, falling back through the media types on a 4xx and
 * always surfacing SAP's response body.
 */
export declare function createFunctionModuleDirect(connection: IAbapConnection, params: FunctionModuleCreateParams): Promise<AxiosResponse>;
/** ADT URI of a function module. */
export declare function functionModuleUri(functionGroupName: string, functionModuleName: string): string;
/**
 * Set a function module's processing type on an EXISTING module.
 *
 * This exists because SAP **silently ignores** the processing-type attributes on
 * the create POST. Measured on DM2/310: creating with
 * `fmodule:processingType="update" fmodule:updateTaskKind="startImmediate"` in
 * the body succeeds with HTTP 200 and the module reads back as
 * `processingType="normal"` — with v2 AND with v3. So the type has to be applied
 * as a separate read-modify-write on the metadata, which is what SE37 does when
 * you change the radio button on an existing module.
 *
 * The attribute only reaches TFDIR-UTASK on ACTIVATION: before activating, ADT
 * reports the new value while `TFDIR-UTASK` is still blank. Verified end to end
 * (create -> set -> activate -> `TFDIR-UTASK = '1'`).
 */
export declare function setFunctionModuleProcessingType(connection: IAbapConnection, functionGroupName: string, functionModuleName: string, processingType: FunctionModuleProcessingType, transportRequest?: string): Promise<void>;
/**
 * Read back `processingType`/`updateTaskKind` from a function module's metadata.
 *
 * Used to VERIFY a create rather than trust it: the whole point of the
 * processing type is a runtime behaviour, and reporting "created as an update
 * module" without checking is precisely the failure mode this repo keeps
 * removing.
 */
export declare function parseFunctionModuleProcessing(xml: string): {
    processing_type: string | null;
    update_task_kind: string | null;
};
/** The ADT attribute pair a caller's `processing_type` should produce. */
export declare function expectedProcessing(processingType: FunctionModuleProcessingType | undefined): {
    processingType: string;
    updateTaskKind?: string;
};
//# sourceMappingURL=functionModuleCreate.d.ts.map