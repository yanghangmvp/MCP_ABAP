/**
 * Handler for retrieving all valid ADT object types and validating a type.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAdtTypes";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve all valid ADT object types (CLAS, TABL, PROG, DEVC, FUGR, INTF, DDLS, DTEL, DOMA, SRVD, SRVB, BDEF, DDLX, etc.) or validate a specific type name.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly validate_type: {
                readonly type: "string";
                readonly description: "Type name to validate (optional)";
            };
        };
        readonly required: readonly [];
    };
};
export declare function handleGetAdtTypes(context: HandlerContext, _args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetAllTypes.d.ts.map