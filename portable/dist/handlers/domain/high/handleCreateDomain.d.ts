/**
 * CreateDomain Handler - ABAP Domain Creation via ADT API
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: create -> check -> unlock -> (activate)
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "CreateDomain";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Operation: Create. Subject: Domain. Will be useful for creating domain. Create a new ABAP domain in SAP system. Creates the domain object in initial state.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly domain_name: {
                readonly type: "string";
                readonly description: "Domain name (e.g., ZZ_TEST_0001). Must follow SAP naming conventions.";
            };
            readonly description: {
                readonly type: "string";
                readonly description: "(optional) Domain description. If not provided, domain_name will be used.";
            };
            readonly package_name: {
                readonly type: "string";
                readonly description: "(optional) Package name (e.g., ZOK_LOCAL, $TMP for local objects)";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "(optional) Transport request number (e.g., ABCK900001). Required for transportable packages.";
            };
            readonly datatype: {
                readonly type: "string";
                readonly description: "(optional) Data type: CHAR, NUMC, DATS, TIMS, DEC, INT1, INT2, INT4, INT8, CURR, QUAN, etc.";
                readonly default: "CHAR";
            };
            readonly length: {
                readonly type: "number";
                readonly description: "(optional) Field length (max depends on datatype)";
                readonly default: 100;
            };
            readonly decimals: {
                readonly type: "number";
                readonly description: "(optional) Decimal places (for DEC, CURR, QUAN types)";
                readonly default: 0;
            };
            readonly conversion_exit: {
                readonly type: "string";
                readonly description: "(optional) Conversion exit routine name (without CONVERSION_EXIT_ prefix)";
            };
            readonly lowercase: {
                readonly type: "boolean";
                readonly description: "(optional) Allow lowercase input";
                readonly default: false;
            };
            readonly sign_exists: {
                readonly type: "boolean";
                readonly description: "(optional) Field has sign (+/-)";
                readonly default: false;
            };
            readonly value_table: {
                readonly type: "string";
                readonly description: "(optional) Value table name for foreign key relationship";
            };
            readonly activate: {
                readonly type: "boolean";
                readonly description: "(optional) Activate domain after creation (default: true)";
                readonly default: true;
            };
            readonly fixed_values: {
                readonly type: "array";
                readonly description: "(optional) Array of fixed values for domain value range";
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
        readonly required: readonly ["domain_name"];
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
    super_package?: string;
}
/**
 * Main handler for CreateDomain MCP tool
 *
 * Uses DomainBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export declare function handleCreateDomain(context: HandlerContext, args: DomainArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleCreateDomain.d.ts.map