/**
 * UpdateDomain Handler - Update Existing ABAP Domain
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: lock -> update -> check -> unlock -> (activate)
 * Note: No validation step - lock will fail if domain doesn't exist
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateDomain";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Update, Create. Subject: Domain. Will be useful for updating or creating domain. Update an existing ABAP domain. Locks, updates with provided parameters (complete replacement), unlocks, and optionally activates.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name to update (e.g., ZZ_TEST_0001)";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "New domain description (optional)";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly datatype: {
                readonly type: "string";
                readonly description: "Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "Field length (max depends on datatype)";
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "Decimal places (for DEC, CURR, QUAN types)";
            };
            readonly conversion_exit: {
                readonly type: "string";
                readonly description: "Conversion exit routine name (without CONVERSION_EXIT_ prefix)";
            };
            readonly lowercase: {
                readonly type: "boolean";
                readonly description: "Allow lowercase input";
            };
            readonly sign_exists: {
                readonly type: "boolean";
                readonly description: "Field has sign (+/-)";
            };
            readonly value_table: {
                readonly type: "string";
                readonly description: "Value table name for foreign key relationship";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "Activate after the update. DEFAULT: TRUE — omitting it activates the object. Pass false to leave it inactive (e.g. when several mutually dependent objects must be activated together afterwards with ActivateObjects). The activated field in the response is SAP's own verdict, not a copy of this parameter.";
                readonly default: true;
            };
            readonly fixed_values: {
                readonly type: "array";
                readonly description: "Array of fixed values for domain value range";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly low: {
                            readonly type: "string";
                            readonly description: "Fixed value (e.g., '001', 'A')";
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly description: "Description text for the fixed value";
                        };
                    };
                    readonly required: readonly ["low", "text"];
                };
            };
        };
        readonly required: readonly ["domain_name", "package_name"];
    };
};
interface DomainArgs {
    domain_name: string;
    description?: string;
    package_name: string;
    transport_request?: string;
    datatype?: string;
    length?: number;
    decimals?: number;
    conversion_exit?: string;
    lowercase?: boolean;
    sign_exists?: boolean;
    value_table?: string;
    activate?: boolean;
    fixed_values?: Array<{
        low: string;
        text: string;
    }>;
}
/**
 * Main handler for UpdateDomain tool
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleUpdateDomain(context: HandlerContext, args: DomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleUpdateDomain.d.ts.map