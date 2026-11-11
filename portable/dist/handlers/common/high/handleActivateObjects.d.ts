/**
 * ActivateObjects Handler - Group/mass activation of ABAP repository objects
 *
 * Activates one or multiple objects in a single call.
 * Uses the ADT group activation endpoint (/sap/bc/adt/activation).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateObjects";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Activate one or multiple ABAP repository objects. Use after Create/Update when objects remain inactive, or for group activation of related objects (e.g., domains + data elements + tables together). Works with any object type.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly objects: {
                readonly type: "array";
                readonly description: "Array of objects to activate. Each object must have 'name' and 'type'.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "Object name in uppercase (e.g., ZOK7_D_MTART, ZCL_MY_CLASS)";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly description: "Object type code: DOMA (domain), DTEL (data element), TABL (table), STRU (structure), DDLS (CDS view), CLAS (class), INTF (interface), PROG (program), FUGR (function group), FUGR/FF (function module), TTYP (table type), SRVD (service definition), SRVB (service binding), BDEF (behavior definition), DDLX (metadata extension), DCLS (access control), ENHO (enhancement)";
                        };
                    };
                    readonly required: readonly ["name", "type"];
                };
            };
            readonly preaudit: {
                readonly type: "boolean";
                readonly description: "Request pre-audit before activation. Default: true";
            };
        };
        readonly required: readonly ["objects"];
    };
};
export declare function handleActivateObjects(context: HandlerContext, args: unknown): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleActivateObjects.d.ts.map