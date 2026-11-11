/**
 * Message class (MSAG) message-list editing.
 *
 * WHY: `UpdateMessageClass` has whole-set REPLACE semantics — the caller sends
 * the complete message list and it becomes the new list. To add one message to a
 * 109-message class the caller must therefore re-emit all 109 by hand, and a
 * caller-assembled whole-set replace is exactly the shape that silently drops
 * one element. A lost message TEXT is invisible until some branch raises it.
 *
 * So the single-message operations read the CURRENT list from SAP, change one
 * entry, and write the list back. The caller never has to hold the other 108,
 * which means it cannot lose them.
 *
 * Two details that make the round trip work at all:
 *
 *  - `mc:selfexplainatory` (SAP's spelling, with the typo) is an attribute
 *    string "true"/"false". `GetMessageClass` used to return it AS a string
 *    while `UpdateMessageClass` declared a boolean, so the documented
 *    read-modify-resend loop did not round-trip cleanly. Everything here uses a
 *    real boolean and converts at the XML boundary.
 *  - the root open tag and `adtcore:packageRef` of the existing document are
 *    PRESERVED verbatim. They carry the namespaces, master language and package,
 *    and rebuilding them from guesses is how a write loses attributes nobody
 *    notices for months.
 */
export interface MessageEntry {
    msgno: string;
    text: string;
    self_explanatory: boolean;
}
/**
 * Extract the master (original) language from a message class document.
 *
 * ADT carries it as `adtcore:masterLanguage` on the `<mc:messageClass>` root; it
 * maps to `T100A-MASTERLANG` and is the translation BASELINE — every text is
 * authored in it and SE63 keys off it. It is DISTINCT from `adtcore:language`,
 * which is only the response/session language (e.g. a read under a ZH session
 * returns `adtcore:language="ZH"` for a class whose master language is EN), so a
 * caller must never read the baseline off `adtcore:language`.
 */
export declare function parseMasterLanguage(xml: string): string | undefined;
/**
 * ADT/ISO language code -> the one-character SAP key stored in T100-SPRSL.
 *
 * Only the codes that differ need listing; for the rest the SAP key is the first
 * letter (EN -> E, DE -> D). ZH -> '1' and JA -> 'J' are the ones that bite: a
 * naive first-letter mapping would look for 'Z' and conclude the master row had
 * vanished. Returns the input's first letter when unknown, which is right far
 * more often than it is wrong and is only ever used to LOCATE a row, never to
 * write one.
 */
export declare const SAP_LANGUAGE_KEY: Record<string, string>;
export declare function sapLanguageKey(code: string): string;
/** ADT URI of a message class. */
export declare function messageClassUri(name: string): string;
/** SAP message numbers are 3 digits, zero-padded ('7' -> '007'). */
export declare function normaliseMsgno(msgno: string | number): string;
/** Parse the `<mc:messages/>` entries of a message class document. */
export declare function parseMessageEntries(xml: string): MessageEntry[];
/** Render one `<mc:messages/>` element. */
export declare function buildMessageElement(entry: MessageEntry): string;
/**
 * Rebuild a message class document with a new message list, keeping the original
 * root element and packageRef.
 *
 * Throws when the document cannot be parsed rather than writing a body built
 * from assumptions — a malformed write here would replace the whole class.
 */
export declare function buildMessageClassDocument(currentXml: string, messages: MessageEntry[]): string;
export type MessageEditMode = 'add' | 'update';
/**
 * Apply a single-message change to a list.
 *
 * The modes deliberately do NOT overlap: `add` refuses an existing number and
 * `update` refuses a missing one. An upsert would let a typo in a message number
 * silently overwrite a different message's text, which is the failure this whole
 * module exists to avoid.
 */
export declare function applyMessageEdit(messages: MessageEntry[], mode: MessageEditMode, msgno: string, text?: string, selfExplanatory?: boolean): MessageEntry[];
//# sourceMappingURL=messageClassXml.d.ts.map