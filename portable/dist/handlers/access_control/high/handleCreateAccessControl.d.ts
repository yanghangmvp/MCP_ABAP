/**
 * CreateAccessControl Handler - Create a CDS access control (DCL / DCLS).
 *
 * Chain: validate (existence gate) -> POST bare object -> [lock -> PUT source
 * -> unlock -> activate].
 *
 * Issued in-repo rather than through `client.getAccessControl()`; see
 * src/lib/accessControlXml.ts for the three dep defects that motivates.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name (e.g., Z_MY_VIEW). Start with Z or Y, max 30 chars. By convention it matches the CDS entity it protects.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., $TMP, ZMY_PKG).";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Description (defaults to the object name). Max 60 chars; XML metacharacters are escaped for you.";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Complete DCL source. Strongly recommended: without it the object is created empty and activation is skipped, because an empty DCL cannot activate.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request. Required for transportable packages, omit for $TMP.";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after writing the source. DEFAULT: TRUE, but only applies when source_code is supplied (an empty DCL cannot activate). The activated field in the response is SAP’s own verdict, not a copy of this parameter.";
            };
        };
        readonly required: readonly ["access_control_name", "package_name"];
    };
};
interface CreateAccessControlArgs {
    access_control_name: string;
    package_name: string;
    description?: string;
    source_code?: string;
    transport_request?: string;
    activate?: boolean;
}
export declare function handleCreateAccessControl(context: HandlerContext, args: CreateAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateAccessControl.d.ts.map