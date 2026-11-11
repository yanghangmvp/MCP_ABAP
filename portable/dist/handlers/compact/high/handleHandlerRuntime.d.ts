import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "HandlerRuntime";
    readonly available_in: readonly ["onprem"];
    readonly description: "Execute. object_type='program' (onprem only) or 'class' (needs IF_OO_ADT_CLASSRUN). Required: object_name. Optional: profile, description. Response: JSON output.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly object_type: {
                readonly type: "string";
                readonly enum: readonly ["program", "class"];
                readonly description: "'program' runs a report (onprem only); 'class' runs a class implementing IF_OO_ADT_CLASSRUN.";
            };
            readonly object_name: {
                readonly type: "string";
                readonly description: "Program or class name.";
            };
            readonly profile: {
                readonly type: "boolean";
                readonly description: "Run with the profiler.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "Trace description.";
            };
        };
        readonly required: readonly ["object_type", "object_name"];
    };
};
type HandlerRuntimeArgs = {
    object_type?: string;
    object_name?: string;
    profile?: boolean;
    description?: string;
};
export declare function handleHandlerRuntime(context: HandlerContext, args: HandlerRuntimeArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleHandlerRuntime.d.ts.map