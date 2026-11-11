/**
 * CheckAccessControl Handler - Syntax-check a DCL source.
 *
 * With `source_code` the check runs against the SUBMITTED text (inline base64
 * artifact), so a caller can validate a draft before writing it. Without it,
 * the stored version named by `version` is checked.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name (must exist in the system).";
            };
            readonly source_code: {
                readonly type: "string";
                readonly description: "Optional draft source to check INSTEAD of the stored version. Use this to validate before an update.";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Which stored version to check when source_code is omitted: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
        };
        readonly required: readonly ["access_control_name"];
    };
};
interface CheckAccessControlArgs {
    access_control_name: string;
    source_code?: string;
    version?: 'active' | 'inactive';
}
export declare function handleCheckAccessControl(context: HandlerContext, args: CheckAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCheckAccessControl.d.ts.map