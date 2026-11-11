import type { ObjectReference } from '@mcp-abap-adt/adt-clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import type { CompactObjectType } from './compactObjectTypes';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerActivate";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Activate operation. Single mode(object_name*, object_adt_type*). Batch mode(objects[].name*, objects[].type*).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly enum: CompactObjectType[];
                readonly description: "ABAP object type for routed compact operation.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Object name for single-object activation form.";
            };
            readonly object_adt_type: {
                readonly type: "string";
                readonly description: "ADT object type code (e.g. CLAS/OC, PROG/P). Required for single-object activation form.";
            };
            readonly objects: {
                readonly type: "array";
                readonly description: "Explicit objects list for batch activation.";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                            readonly description: "Object name.";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly description: "ADT object type code.";
                        };
                        readonly uri: {
                            readonly type: "string";
                            readonly description: "Optional ADT object URI.";
                        };
                    };
                    readonly required: readonly ["name", "type"];
                };
            };
            readonly preaudit: {
                readonly type: "boolean";
                readonly description: "Run pre-audit checks before activation.";
            };
        };
    };
};
type HandlerActivateArgs = {
    object_type?: CompactObjectType;
    object_name?: string;
    object_adt_type?: string;
    objects?: Array<ObjectReference & {
        uri?: string;
    }>;
    preaudit?: boolean;
};
export declare function handleHandlerActivate(context: HandlerContext, args: HandlerActivateArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerActivate.d.ts.map