/**
 * UpdateClassTestClasses Handler - Update ABAP Unit test include for a class
 *
 * Uses AdtClient.updateClassTestIncludes from @mcp-abap-adt/adt-clients.
 * Low-level handler: single method call.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateClassTestClassesLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Upload ABAP Unit test include source code for an existing class. Requires test_classes_lock_handle from LockClassTestClassesLow.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly class_name: {
                readonly type: "string";
                readonly description: "Class name (e.g., ZCL_MY_CLASS).";
            };
            readonly test_class_source: {
                readonly type: "string";
                readonly description: "Complete ABAP Unit test class source code.";
            };
            readonly lock_handle: {
                readonly type: "string";
                readonly description: "Test classes lock handle from LockClassTestClassesLow.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number. Required when the parent class is a transportable (non-$TMP) object; forwarded as corrNr so the test-include write is recorded in the request. Omit for $TMP/local classes.";
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
        readonly required: readonly ["class_name", "test_class_source", "lock_handle"];
    };
};
interface UpdateClassTestClassesArgs {
    class_name: string;
    test_class_source: string;
    lock_handle: string;
    transport_request?: string;
    session_id?: string;
    session_state?: {
        cookies?: string;
        csrf_token?: string;
        cookie_store?: Record<string, string>;
    };
}
export declare function handleUpdateClassTestClasses(context: HandlerContext, args: UpdateClassTestClassesArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateClassTestClasses.d.ts.map