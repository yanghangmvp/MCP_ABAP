import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CheckPackage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "Perform syntax check on an ABAP package. Returns syntax errors, warnings, and messages.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZMY_PACKAGE).";
            };
            readonly super_package: {
                readonly type: "string";
                readonly description: "Super package name (parent package).";
            };
        };
        readonly required: readonly ["package_name", "super_package"];
    };
};
export declare function handleCheckPackage(context: HandlerContext, args: {
    package_name: string;
    super_package: string;
}): Promise<{
    isError: boolean;
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=handleCheckPackage.d.ts.map