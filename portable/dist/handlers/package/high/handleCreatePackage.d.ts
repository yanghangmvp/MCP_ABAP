/**
 * CreatePackage Handler - Create ABAP Package via ADT API
 *
 * Uses PackageBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> create -> check
 */
import * as z from 'zod';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreatePackage";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Create a new ABAP package in SAP system. Packages are containers for development objects and are essential for organizing code.";
    readonly inputSchema: {
        readonly package_name: z.ZodString;
        readonly description: z.ZodOptional<z.ZodString>;
        readonly super_package: z.ZodOptional<z.ZodString>;
        readonly package_type: z.ZodDefault<z.ZodEnum<{
            structure: "structure";
            development: "development";
        }>>;
        readonly software_component: z.ZodOptional<z.ZodString>;
        readonly transport_layer: z.ZodOptional<z.ZodString>;
        readonly transport_request: z.ZodOptional<z.ZodString>;
        readonly record_changes: z.ZodOptional<z.ZodBoolean>;
        readonly application_component: z.ZodOptional<z.ZodString>;
    };
};
interface CreatePackageArgs {
    package_name: string;
    description?: string;
    super_package?: string;
    package_type?: string;
    software_component?: string;
    transport_layer?: string;
    transport_request?: string;
    record_changes?: boolean;
    application_component?: string;
}
/**
 * Main handler for CreatePackage MCP tool
 *
 * Uses PackageBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreatePackage(context: HandlerContext, args: CreatePackageArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreatePackage.d.ts.map