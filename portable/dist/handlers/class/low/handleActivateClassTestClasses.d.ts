/**
 * ActivateClassTestClasses Handler - Activate ABAP Unit test include for a class
 *
 * Uses AdtClient.activateTestClasses from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateClassTestClassesLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Activate ABAP Unit test classes include for an existing class. Should be executed after updating and unlocking test classes.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
            };
            readonly test_class_name: {
                readonly type: "string";
                readonly description: "Optional ABAP Unit test class name (e.g., LTCL_MY_CLASS). Defaults to auto-detected value.";
            };
            readonly session_id: {
                readonly type: "string";
                readonly description: "Session ID from GetSession. If not provided, a new session will be created.";
            };
            readonly session_state: {
                readonly type: "object";
                readonly description: "Session state from GetSession (cookies, csrf_token, cookie_store). Required if session_id is provided.";
                readonly properties: {
                    readonly cookies: {
                        readonly type: "string";
                    };
                    readonly csrf_token: {
                        readonly type: "string";
                    };
                    readonly cookie_store: {
                        readonly type: "object";
                    };
                };
            };
        };
        readonly required: readonly ["class_name"];
    };
};
interface ActivateClassTestClassesArgs {
    class_name: string;
    test_class_name?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleActivateClassTestClasses(context: HandlerContext, args: ActivateClassTestClassesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateClassTestClasses.d.ts.map