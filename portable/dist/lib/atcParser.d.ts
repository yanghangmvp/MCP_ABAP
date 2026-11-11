/**
 * Shared parsing helpers for the ADT ATC (ABAP Test Cockpit) REST endpoints.
 * Used by handleRunAtc / handleGetAtcWorklist / handleGetAtcCustomizing.
 *
 * Field coverage aligned with abap-adt-api's atcWorklists parser
 * (quickfixInfo, processor, lastChangedBy, link, objectTypeId).
 */
/** Ensure a parsed XML node is always an array (fast-xml-parser collapses single children). */
export declare function asArray<T>(value: T | T[] | undefined | null): T[];
export declare function parseAtcXml(xml: string): any;
export interface AtcCustomizingInfo {
    properties: Record<string, string | boolean | number>;
    exemption_reasons: Array<{
        id: string;
        title: string;
        justification_mandatory: boolean;
    }>;
    system_check_variant: string | null;
}
/** Parse ATC customizing XML: properties + exemption reasons. */
export declare function parseAtcCustomizing(customizingXml: string): AtcCustomizingInfo;
export interface AtcWorklistResult {
    worklist_id: string | null;
    worklist_timestamp: string | null;
    object_set_is_complete: boolean | null;
    objects: any[];
    findings: any[];
}
/** Flatten an ATC worklist XML into object summaries + a findings array. */
export declare function parseAtcWorklist(worklistXml: string): AtcWorklistResult;
/** Summarize findings by priority (priority_1: n, ...). */
export declare function findingsByPriority(findings: any[]): Record<string, number>;
/** Build the ATC run request XML for one or more object URIs. */
export declare function buildAtcRunBody(objectUris: string[], maxResults: number): string;
//# sourceMappingURL=atcParser.d.ts.map