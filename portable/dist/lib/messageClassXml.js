"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAP_LANGUAGE_KEY = void 0;
exports.parseMasterLanguage = parseMasterLanguage;
exports.sapLanguageKey = sapLanguageKey;
exports.messageClassUri = messageClassUri;
exports.normaliseMsgno = normaliseMsgno;
exports.parseMessageEntries = parseMessageEntries;
exports.buildMessageElement = buildMessageElement;
exports.buildMessageClassDocument = buildMessageClassDocument;
exports.applyMessageEdit = applyMessageEdit;
const adtObjectOps_1 = require("./adtObjectOps");
const utils_1 = require("./utils");
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
function parseMasterLanguage(xml) {
    const openTag = /<mc:messageClass[^>]*>/.exec(xml ?? '')?.[0];
    if (!openTag)
        return undefined;
    return /adtcore:masterLanguage="([^"]*)"/.exec(openTag)?.[1] || undefined;
}
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
exports.SAP_LANGUAGE_KEY = {
    ZH: '1',
    ZF: 'M',
    JA: 'J',
    KO: '3',
    EN: 'E',
    DE: 'D',
    FR: 'F',
    ES: 'S',
    IT: 'I',
    PT: 'P',
    RU: 'R',
    NL: 'N',
    PL: 'L',
    TR: 'T',
    CS: 'C',
};
function sapLanguageKey(code) {
    const upper = code.trim().toUpperCase();
    return exports.SAP_LANGUAGE_KEY[upper] ?? upper.charAt(0);
}
/** ADT URI of a message class. */
function messageClassUri(name) {
    return `/sap/bc/adt/messageclass/${(0, utils_1.encodeSapObjectName)(name.toUpperCase()).toLowerCase()}`;
}
/** SAP message numbers are 3 digits, zero-padded ('7' -> '007'). */
function normaliseMsgno(msgno) {
    return String(msgno).trim().padStart(3, '0');
}
function decodeXml(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}
/** Parse the `<mc:messages/>` entries of a message class document. */
function parseMessageEntries(xml) {
    const out = [];
    for (const m of (xml ?? '').matchAll(/<mc:messages\s([^>]*?)\/?>/g)) {
        const attrs = m[1];
        const get = (a) => new RegExp(`mc:${a}="([^"]*)"`).exec(attrs)?.[1];
        const msgno = get('msgno');
        if (msgno == null)
            continue;
        out.push({
            msgno,
            text: decodeXml(get('msgtext') || ''),
            // SAP omits the attribute for some messages; absent means self-explanatory.
            self_explanatory: (get('selfexplainatory') ?? 'true') !== 'false',
        });
    }
    return out;
}
/** Render one `<mc:messages/>` element. */
function buildMessageElement(entry) {
    return (`<mc:messages mc:msgno="${(0, adtObjectOps_1.escXml)(normaliseMsgno(entry.msgno))}" ` +
        `mc:msgtext="${(0, adtObjectOps_1.escXml)(entry.text ?? '')}" ` +
        `mc:selfexplainatory="${entry.self_explanatory === false ? 'false' : 'true'}" ` +
        'adtcore:name=""/>');
}
/**
 * Rebuild a message class document with a new message list, keeping the original
 * root element and packageRef.
 *
 * Throws when the document cannot be parsed rather than writing a body built
 * from assumptions — a malformed write here would replace the whole class.
 */
function buildMessageClassDocument(currentXml, messages) {
    const openTag = /<mc:messageClass[^>]*>/.exec(currentXml ?? '')?.[0];
    if (!openTag) {
        throw new Error('Could not parse the existing message class document (no <mc:messageClass> root). ' +
            'Refusing to write, because a rebuilt root would replace the class metadata.');
    }
    const pkgRef = /<adtcore:packageRef[^>]*\/>/.exec(currentXml)?.[0] ?? '';
    // Keep the list in message-number order, which is how SE91 shows it and makes
    // a later diff readable.
    const sorted = [...messages].sort((a, b) => normaliseMsgno(a.msgno).localeCompare(normaliseMsgno(b.msgno)));
    return ('<?xml version="1.0" encoding="UTF-8"?>' +
        openTag +
        pkgRef +
        sorted.map(buildMessageElement).join('') +
        '</mc:messageClass>');
}
/**
 * Apply a single-message change to a list.
 *
 * The modes deliberately do NOT overlap: `add` refuses an existing number and
 * `update` refuses a missing one. An upsert would let a typo in a message number
 * silently overwrite a different message's text, which is the failure this whole
 * module exists to avoid.
 */
function applyMessageEdit(messages, mode, msgno, text, selfExplanatory) {
    const target = normaliseMsgno(msgno);
    const index = messages.findIndex((m) => normaliseMsgno(m.msgno) === target);
    if (mode === 'add') {
        if (index >= 0) {
            throw new Error(`Message ${target} already exists in this class (text: "${messages[index].text}"). ` +
                'Use UpdateMessage to change it — adding would overwrite a message that is ' +
                'probably already referenced in code.');
        }
        return [
            ...messages,
            {
                msgno: target,
                text: text ?? '',
                self_explanatory: selfExplanatory !== false,
            },
        ];
    }
    if (mode === 'update') {
        if (index < 0) {
            throw new Error(`Message ${target} does not exist in this class, so there is nothing to update. ` +
                'Use AddMessage to create it.');
        }
        const next = [...messages];
        next[index] = {
            msgno: target,
            // Omitted fields keep their current value.
            text: text ?? next[index].text,
            self_explanatory: selfExplanatory ?? next[index].self_explanatory,
        };
        return next;
    }
    throw new Error(`Unsupported message edit mode: ${mode}`);
}
//# sourceMappingURL=messageClassXml.js.map