import * as z from 'zod';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetPackageContents";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: "[read-only] Retrieve objects inside an ABAP package as a flat list. Supports recursive traversal of subpackages. A package that does not exist is an ERROR, never an empty list — so [] means the package is real and empty.";
    readonly notes: "False zero, closed. /repository/nodestructure answers with the SAME empty node set for a\npackage that exists and is empty and for a package name that does not exist at all — measured: a\nguessed name and a deliberate ZZZ_NO_SUCH_PACKAGE_99 both returned [], while the real package\nreturned 39 objects. A caller therefore could not tell \"empty\" from \"not there\", and concluding\n\"empty\" is the wrong answer that looks right.\n\nSo when the contents come back empty the package's existence is confirmed independently:\nGET /sap/bc/adt/packages/{name} is an exact oracle (measured 200 for an EMPTY package, 200 for a\npopulated one, 404 for a name that is not there). Missing -> an error naming the package. Present ->\n[] , which now provably means empty. If the oracle itself cannot answer, that is also an error: a\nzero this tool cannot stand behind is the defect, not the answer.\n\nThe check costs one extra request and only runs on an empty result, so a populated package pays\nnothing for it.";
    readonly inputSchema: {
        readonly package_name: z.ZodString;
        readonly include_subpackages: z.ZodOptional<z.ZodBoolean>;
        readonly max_depth: z.ZodOptional<z.ZodNumber>;
        readonly include_descriptions: z.ZodOptional<z.ZodBoolean>;
    };
};
interface GetPackageContentsArgs {
    package_name: string;
    include_subpackages?: boolean;
    max_depth?: number;
    include_descriptions?: boolean;
}
export declare function handleGetPackageContents(context: HandlerContext, args: GetPackageContentsArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetPackageContents.d.ts.map