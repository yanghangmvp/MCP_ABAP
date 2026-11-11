export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectsList";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Recursively retrieves all child ABAP repository objects for a given parent — programs (PROG), function groups (FUGR), classes (CLAS), packages (DEVC), and other composite objects — including nested includes and subcomponents.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly parent_name: {
                readonly type: "string";
                readonly description: "[read-only] Parent object name";
            };
            readonly parent_tech_name: {
                readonly type: "string";
                readonly description: "[read-only] Parent technical name";
            };
            readonly parent_type: {
                readonly type: "string";
                readonly description: "[read-only] Parent object type (e.g. PROG/P, FUGR)";
            };
            readonly with_short_descriptions: {
                readonly type: "boolean";
                readonly description: "[read-only] Include short descriptions (default: true)";
            };
        };
        readonly required: readonly ["parent_name", "parent_tech_name", "parent_type"];
    };
};
import type { HandlerContext } from '../../../lib/handlers/interfaces';
/**
 * Main handler for GetObjectsListStrict
 * @param args { parent_name, parent_tech_name, parent_type, with_short_descriptions }
 */
export declare function handleGetObjectsList(context: HandlerContext, args: any): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    cache: any;
    isError?: undefined;
} | {
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
    cache?: undefined;
}>;
//# sourceMappingURL=handleGetObjectsList.d.ts.map