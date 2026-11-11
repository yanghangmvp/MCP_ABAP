import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "ReadMetadataExtension";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Read, Create, Update. Subject: MetadataExtension. Will be useful for reading, creating, or updating metadata extension. [read-only] Read ABAP metadata extension (DDLX) source code and metadata. Answers: \"show metadata extension\", \"display DDLX source\", \"view UI annotations\", \"get metadata extension X\". Returns source code, package, responsible, description.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly metadata_extension_name: {
                readonly type: "string";
                readonly description: "Metadata extension name (e.g., Z_MY_DDLX).";
            };
            readonly version: {
                readonly type: "string";
                readonly enum: readonly ["active", "inactive"];
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly default: "active";
            };
        };
        readonly required: readonly ["metadata_extension_name"];
    };
};
export declare function handleReadMetadataExtension(context: HandlerContext, args: {
    metadata_extension_name: string;
    version?: 'active' | 'inactive';
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleReadMetadataExtension.d.ts.map