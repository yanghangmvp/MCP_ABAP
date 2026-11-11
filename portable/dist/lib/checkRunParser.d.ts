import type { IAdtResponse } from '@mcp-abap-adt/interfaces';
import type { AxiosResponse } from 'axios';
export interface CheckRunMessage {
    type: string;
    text: string;
    line?: string | number;
    column?: number;
    href?: string;
}
/**
 * ADT reports a check message's position ONLY in the fragment of its
 * `chkrun:uri`, e.g. `/sap/bc/adt/oo/classes/zcl_x/source/main#start=42,7`.
 * There is no `line` attribute on the element, so the `line` field was
 * effectively always undefined and every consumer dropped the position.
 *
 * That is the whole of field report round-3 K-3: a caller receives
 * `Field "IO_OUT" is unknown.` twelve times with no positions, and the only way
 * forward is to re-read the source, guess, and re-send the entire object. The
 * reporter measured 55 such blind re-sends — 661 KB, ~169k tokens — in one
 * project.
 */
export declare function positionFromHref(href?: string): {
    line?: number;
    column?: number;
};
export interface ParsedCheckRunResult {
    success: boolean;
    status: string;
    message: string;
    errors: CheckRunMessage[];
    warnings: CheckRunMessage[];
    info: CheckRunMessage[];
    total_messages: number;
    has_errors: boolean;
    has_warnings: boolean;
}
export declare function parseCheckRunResponse(response: IAdtResponse | AxiosResponse): ParsedCheckRunResult;
//# sourceMappingURL=checkRunParser.d.ts.map