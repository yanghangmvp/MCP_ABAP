/**
 * GetMessageClass Handler - Read an ABAP message class (MSAG) and its messages.
 * ADT: GET /sap/bc/adt/messageclass/{name}. No adt-clients wrapper.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetMessageClass";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly notes: "Reading a translation (the language parameter). ADT falls back to the MASTER text for\nevery message with no row in the requested language, so a read in ZH of a half-translated class\nreturns a full set of texts and LOOKS finished. That is the read-side face of the trap that made\nUpdateMessage write one message at a time.\n\nSo a language read is answered from two sources: the ADT document supplies the texts (rendered in\nthat language), and T100 supplies the truth about which messages actually HAVE a row there. Each\nmessage carries translated, and the summary carries translated_count / untranslated_count, so a\npartial translation is visible instead of looking done.\n\nIf the T100 read fails, the translated flags and the counts are OMITTED and a warning says why —\nthey are never guessed from the text, because a translation that happens to equal the master text is\nstill a translation and comparing strings would report it missing.\n\nlanguage is the ADT/ISO code (ZH, DE, JA); the SPRSL key it maps to is reported as language_key.\nWithout language the class is read in the session language, which this server pins to SAP_LANGUAGE.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name (e.g., ZMY_MSG).";
            };
            readonly version: {
                readonly type: "string";
                readonly description: "Version to read: \"active\" (default) or \"inactive\".";
                readonly enum: readonly ["active", "inactive"];
            };
            readonly language: {
                readonly type: "string";
                readonly description: "ADT/ISO code (e.g. \"ZH\", \"DE\") to read that translation. See Notes.";
            };
            readonly from_msgno: {
                readonly type: "string";
                readonly description: string;
            };
            readonly to_msgno: {
                readonly type: "string";
                readonly description: "Return only messages with a number <= this (inclusive).";
            };
            readonly include_texts: {
                readonly type: "boolean";
                readonly description: string;
            };
            readonly include_raw_xml: {
                readonly type: "boolean";
                readonly description: string;
            };
        };
        readonly required: readonly ["message_class_name"];
    };
};
interface GetMessageClassArgs {
    message_class_name: string;
    version?: 'active' | 'inactive';
    language?: string;
    from_msgno?: string;
    to_msgno?: string;
    include_texts?: boolean;
    include_raw_xml?: boolean;
}
export declare function handleGetMessageClass(context: HandlerContext, args: GetMessageClassArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetMessageClass.d.ts.map