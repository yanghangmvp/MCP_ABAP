import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadPackage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[read-only] Read ABAP package definition and metadata. Answers: \"show package X\", \"display package properties\", \"view package contents\", \"get package info\". Returns definition, super-package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., Z_MY_PACKAGE).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["package_name"];
    };
};
export declare function handleReadPackage(context: HandlerContext, args: {
    package_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadPackage.d.ts.map