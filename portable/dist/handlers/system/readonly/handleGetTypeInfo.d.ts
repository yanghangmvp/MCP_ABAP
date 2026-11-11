/**
 * @TODO Migrate to infrastructure module
 * Endpoints: Multiple fallback chain:
 * - /sap/bc/adt/ddic/domains/{name}/source/main
 * - /sap/bc/adt/ddic/dataelements/{name}
 * - /sap/bc/adt/ddic/tabletypes/{name}
 * - /sap/bc/adt/repository/informationsystem/objectproperties/values
 * This handler uses makeAdtRequestWithTimeout directly and should be moved to adt-clients infrastructure module
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetTypeInfo";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Retrieve ABAP type information for domains (DOMA), data elements (DTEL), table types, and structures. Returns field definitions, value ranges, fixed values, and DDIC metadata.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly type_name: {
                readonly type: "string";
                readonly description: "Name of the ABAP type";
            };
            readonly include_structure_fallback: {
                readonly type: "boolean";
                readonly description: "When true (default), tries DDIC structure lookup only if type lookup returns 404/empty.";
                readonly default: true;
            };
        };
        readonly required: readonly ["type_name"];
    };
};
export declare function handleGetTypeInfo(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        json: any;
    }[];
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetTypeInfo.d.ts.map