import type { HandlerContext } from '../handlers/interfaces';
import type { EnumeratedObject } from './packageEnumerator';
export type SourceVersion = 'active' | 'inactive';
export interface SourceUnit {
    include: string;
    lines: string[];
}
/**
 * The four ADT sub-includes of a class. `source/main` does NOT contain them.
 *
 * MEASURED on S/4HANA 2023 FPS02: a RAP behavior pool's source/main is a 7-line
 * skeleton while its `implementations` include (CCIMP) holds 89 lines — all of
 * the logic. A class whose unit tests live in `testclasses` had 227 lines in main
 * and 394 in the include. Scanning main alone therefore reads almost none of the
 * code and answers "no hits" for text it never opened, which is the I-23 defect:
 * indistinguishable from "read nothing".
 */
export declare const CLASS_INCLUDE_PARTS: readonly ["definitions", "implementations", "testclasses", "macros"];
export type ClassIncludePart = (typeof CLASS_INCLUDE_PARTS)[number];
/**
 * A source unit that could NOT be read.
 *
 * Reported rather than swallowed: a failed read contributes zero hits, which is
 * byte-identical to "this object does not contain the query" unless the failure
 * is surfaced.
 */
export interface ReadFailure {
    object_name: string;
    unit: string;
    reason: string;
}
export interface ReadSourceUnitsOptions {
    /** Read a class's CCDEF/CCIMP/CCAU/CCMAC includes as well (default true). */
    classIncludes?: boolean;
    onReadFailure?: (failure: ReadFailure) => void;
}
export interface FugrChild {
    objecttype: string;
    objectname: string;
}
export interface ReadSourceUnitsDeps {
    readProgram(programName: string, version: SourceVersion): Promise<string | null>;
    readInclude(includeName: string): Promise<string | null>;
    readClassMain(className: string, version: SourceVersion): Promise<string | null>;
    /**
     * Optional so a caller that only exercises the main include (and every existing
     * test double) keeps working; when absent, class sub-includes are skipped.
     */
    readClassInclude?(className: string, part: ClassIncludePart, version: SourceVersion): Promise<string | null>;
    fetchFugrStructure(fugrName: string): Promise<FugrChild[]>;
    readFugrFm(fugrName: string, fmName: string): Promise<string | null>;
    logger?: {
        debug?: (msg: string) => void;
        warn?: (msg: string) => void;
    };
}
export declare function readSourceUnits(deps: ReadSourceUnitsDeps, target: EnumeratedObject, version?: SourceVersion, options?: ReadSourceUnitsOptions): AsyncGenerator<SourceUnit>;
export declare function createSourceReaderDeps(ctx: HandlerContext): ReadSourceUnitsDeps;
//# sourceMappingURL=sourceReader.d.ts.map