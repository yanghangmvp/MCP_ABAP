/**
 * ActivateObject Handler - Universal ABAP Object Activation via ADT API
 */
import type { ObjectReference } from '@mcp-abap-adt/adt-clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ActivateObjectLow";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[low-level] Activate one or multiple ABAP repository objects. Works with any object type; URI is auto-generated from name and type.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly objects: {
                readonly type: "array";
                readonly description: "Array of objects to activate. Each object must have 'name' and 'type'. URI is optional.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "Object name in uppercase";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly description: "Object type code (e.g., 'CLAS/OC', 'PROG/P', 'DDLS/DF')";
                        };
                        readonly uri: {
                            readonly type: "string";
                            readonly description: "Optional ADT URI";
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
interface ActivationObject extends ObjectReference {
    uri?: string;
}
interface ActivateObjectArgs {
    objects: ActivationObject[];
    preaudit?: boolean;
}
export declare function handleActivateObject(context: HandlerContext, params: ActivateObjectArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleActivateObject.d.ts.map