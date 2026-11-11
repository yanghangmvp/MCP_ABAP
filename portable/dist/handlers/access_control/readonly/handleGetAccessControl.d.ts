/**
 * GetAccessControl Handler - Read a DCL source (metadata + source text).
 *
 * Object URI: /sap/bc/adt/acm/dcl/sources/{name}; source at .../source/main.
 * The collection accepts only application/vnd.sap.adt.dclSource+xml.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name (e.g., Z_MY_VIEW, C_ACCOUNTINGDOCUMENT).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["access_control_name"];
    };
};
interface GetAccessControlArgs {
    access_control_name: string;
    version?: 'active' | 'inactive';
}
export declare function handleGetAccessControl(context: HandlerContext, args: GetAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetAccessControl.d.ts.map