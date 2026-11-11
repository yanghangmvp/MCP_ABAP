import type { ILogger } from '@mcp-abap-adt/interfaces';
import { type DataPreviewResult } from '../../../lib/dataPreviewParser';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetSqlQuery";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: string;
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sql_query: {
                readonly type: "string";
                readonly description: "SQL query to execute. Single table only — JOINs are rejected by Data Preview.";
            };
            readonly row_number: {
                readonly type: "number";
                readonly description: "[read-only] Maximum number of rows to return";
                readonly default: 100;
            };
        };
        readonly required: readonly ["sql_query"];
    };
};
/**
 * Interface for SQL query execution response
 */
export interface SqlQueryResponse extends DataPreviewResult {
    sql_query: string;
    row_number: number;
}
/**
 * Parse SAP ADT XML response from a freestyle SQL query.
 *
 * Kept as a named export because handleGetTableContents and handleGetTransaction
 * parse the same payload. The parsing itself lives in lib/dataPreviewParser —
 * see that file for why the previous regex implementation dropped blank cells
 * and shifted values between rows.
 */
export declare function parseSqlQueryXml(xmlData: string, sqlQuery: string, rowNumber: number, logger?: ILogger): SqlQueryResponse;
/**
 * Handler to execute freestyle SQL queries via SAP ADT Data Preview API
 *
 * @param args - Tool arguments containing sql_query and optional row_number parameter
 * @returns Response with parsed SQL query results or error
 */
export declare function handleGetSqlQuery(context: HandlerContext, args: any): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=handleGetSqlQuery.d.ts.map