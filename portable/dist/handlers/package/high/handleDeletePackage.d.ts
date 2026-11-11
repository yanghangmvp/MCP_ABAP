/**
 * DeletePackage Handler - Delete an ABAP package (DEVC)
 *
 * The package handlers already had a working delete, but it was registered ONLY
 * in the low-level group, so a server started with `--exposition=readonly,high`
 * (the RAP lab's configuration) offered no way to delete a package at all —
 * every test round that created packages leaked them. This is the same
 * implementation exposed in the high group, with the post-delete existence
 * verification the other high `Delete*` handlers gained.
 *
 * Deletion goes through `deletePackageWithMessages` rather than the dep's
 * `getPackage().delete()`, because the dep reads `del:message` as a SINGLE
 * message and so collapses SAP's message ARRAY into a generic "Deletion
 * failed" — hiding the actionable reason (package not empty, no TADIR record,
 * locked in a transport, …).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "DeletePackage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZMCP_TEST).";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900065). Required for transportable packages. Omit for local packages ($*).";
            };
        };
        readonly required: readonly ["package_name"];
    };
};
interface DeletePackageArgs {
    package_name: string;
    transport_request?: string;
}
export declare function handleDeletePackage(context: HandlerContext, args: DeletePackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleDeletePackage.d.ts.map