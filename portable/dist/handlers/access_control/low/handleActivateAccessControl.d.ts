/**
 * ActivateAccessControl Handler - Activate a DCL source.
 *
 * Success is decided by SAP's MESSAGES, not by the activation-run flags: ADT
 * reports activationExecuted="true" even for an object it REFUSED, so the old
 * `activated && checked` test read a rejected activation as success.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateAccessControl";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly access_control_name: {
                readonly type: "string";
                readonly description: "DCL name.";
            };
        };
        readonly required: readonly ["access_control_name"];
    };
};
interface ActivateAccessControlArgs {
    access_control_name: string;
}
export declare function handleActivateAccessControl(context: HandlerContext, args: ActivateAccessControlArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateAccessControl.d.ts.map