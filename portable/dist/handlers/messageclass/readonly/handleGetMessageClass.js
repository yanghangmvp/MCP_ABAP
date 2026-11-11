"use strict";
/**
 * GetMessageClass Handler - Read an ABAP message class (MSAG) and its messages.
 * ADT: GET /sap/bc/adt/messageclass/{name}. No adt-clients wrapper.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetMessageClass = handleGetMessageClass;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const messageClassXml_1 = require("../../../lib/messageClassXml");
const utils_1 = require("../../../lib/utils");
const handleGetSqlQuery_1 = require("../../system/readonly/handleGetSqlQuery");
exports.TOOL_DEFINITION = {
    name: 'GetMessageClass',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Read. Subject: MessageClass. Retrieve an ABAP message class (MSAG) with its ' +
        'message numbers and short texts. ' +
        'Returns master_language (T100A-MASTERLANG, from adtcore:masterLanguage) — the translation ' +
        'baseline every text is authored in; this is NOT the response language (adtcore:language). ' +
        'self_explanatory is a real BOOLEAN, matching the UpdateMessageClass schema, so a ' +
        'read-modify-resend round trip is type-clean. ' +
        'A large class can exceed the tool output limit (a 109-message class is ~75 KB with the raw ' +
        'XML), so use from_msgno/to_msgno to page and leave include_raw_xml off. ' +
        'To change ONE message prefer AddMessage / UpdateMessage / DeleteMessage — they preserve ' +
        'the other messages server-side instead of making you resend them. ' +
        'Pass language to read a TRANSLATION: each message then carries translated true/false, ' +
        'because ADT serves the MASTER text for messages that have no row in that language.',
    notes: `Reading a translation (the language parameter). ADT falls back to the MASTER text for
every message with no row in the requested language, so a read in ZH of a half-translated class
returns a full set of texts and LOOKS finished. That is the read-side face of the trap that made
UpdateMessage write one message at a time.

So a language read is answered from two sources: the ADT document supplies the texts (rendered in
that language), and T100 supplies the truth about which messages actually HAVE a row there. Each
message carries translated, and the summary carries translated_count / untranslated_count, so a
partial translation is visible instead of looking done.

If the T100 read fails, the translated flags and the counts are OMITTED and a warning says why —
they are never guessed from the text, because a translation that happens to equal the master text is
still a translation and comparing strings would report it missing.

language is the ADT/ISO code (ZH, DE, JA); the SPRSL key it maps to is reported as language_key.
Without language the class is read in the session language, which this server pins to SAP_LANGUAGE.`,
    inputSchema: {
        type: 'object',
        properties: {
            message_class_name: {
                type: 'string',
                description: 'Message class name (e.g., ZMY_MSG).',
            },
            version: {
                type: 'string',
                description: 'Version to read: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
            language: {
                type: 'string',
                description: 'ADT/ISO code (e.g. "ZH", "DE") to read that translation. See Notes.',
            },
            from_msgno: {
                type: 'string',
                description: 'Return only messages with a number >= this (inclusive), e.g. "100". Compared as a ' +
                    'zero-padded 3-digit string, so "7" and "007" behave the same.',
            },
            to_msgno: {
                type: 'string',
                description: 'Return only messages with a number <= this (inclusive).',
            },
            include_texts: {
                type: 'boolean',
                description: 'Include the short texts. Default true. Set false for a numbers-only listing of a ' +
                    'large class.',
            },
            include_raw_xml: {
                type: 'boolean',
                description: 'Include the raw ADT XML. Default FALSE — it roughly doubles the response and is the ' +
                    'main reason a large class exceeds the output limit.',
            },
        },
        required: ['message_class_name'],
    },
};
/**
 * The message numbers that really HAVE a row in this language.
 *
 * The whole point of the language read: ADT serves the MASTER text for every
 * message with no row in the requested language, so its answer cannot tell a
 * translated message from an untranslated one. T100 can. Returns undefined for
 * "could not determine" — never an empty set, which would report every message
 * as untranslated.
 */
async function readTranslatedMsgnos(client, className, languageKey, logger) {
    const sql = `SELECT msgnr, sprsl FROM t100 ` +
        `WHERE arbgb = '${className.replace(/'/g, "''")}' AND sprsl = '${languageKey.replace(/'/g, "''")}'`;
    // A message class holds at most 1000 messages (000-999), so one page is the
    // whole answer for one language.
    const rowNumber = 1000;
    let attempts = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
        attempts = attempt + 1;
        try {
            const response = await client
                .getUtils()
                .getSqlQuery({ sql_query: sql, row_number: rowNumber });
            if (response?.status !== 200 || !response?.data)
                continue;
            const data = typeof response.data === 'string'
                ? response.data
                : String(response.data);
            const rows = (0, handleGetSqlQuery_1.parseSqlQueryXml)(data, sql, rowNumber, logger).rows;
            return {
                msgnos: new Set(rows.map((row) => (0, messageClassXml_1.normaliseMsgno)(String(row.MSGNR ?? row.msgnr ?? '')))),
                attempts,
            };
        }
        catch (error) {
            logger?.debug?.(`T100 translation read failed (attempt ${attempts}): ${error?.message ?? error}`);
        }
    }
    return { attempts };
}
async function handleGetMessageClass(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.message_class_name)
            return (0, utils_1.return_error)(new Error('message_class_name is required'));
        const client = (0, clients_1.createAdtClient)(connection, logger); // wraps the connection (sap-language pinning)
        const name = args.message_class_name.toUpperCase();
        const language = args.language?.trim().toUpperCase() || undefined;
        if (language && !/^[A-Z]{1,2}$/.test(language)) {
            return (0, utils_1.return_error)(new Error(`language "${args.language}" is not a language key. Pass the ADT/ISO code, ` +
                'e.g. "ZH", "DE", "JA" — not the SAP one-character key.'));
        }
        const url = `/sap/bc/adt/messageclass/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        const xml = await (0, adtObjectOps_1.getAdt)(connection, url, {
            ...(args.version ? { version: args.version } : {}),
            // Renders the texts in the requested language — with the MASTER text
            // substituted wherever no row exists, which is what T100 below corrects.
            ...(language ? { 'sap-language': language } : {}),
        });
        const all = (0, messageClassXml_1.parseMessageEntries)(xml);
        // The master (original) language is the translation baseline (T100A-MASTERLANG).
        // Surface it so setting it wrong is caught here, not after texts are translated.
        const masterLanguage = (0, messageClassXml_1.parseMasterLanguage)(xml);
        const from = args.from_msgno ? (0, messageClassXml_1.normaliseMsgno)(args.from_msgno) : undefined;
        const to = args.to_msgno ? (0, messageClassXml_1.normaliseMsgno)(args.to_msgno) : undefined;
        const selected = all.filter((m) => {
            const no = (0, messageClassXml_1.normaliseMsgno)(m.msgno);
            if (from && no < from)
                return false;
            if (to && no > to)
                return false;
            return true;
        });
        const includeTexts = args.include_texts !== false;
        // Which of these are REALLY translated. Undefined means the question could
        // not be answered, and then no flag is emitted at all: a guess here would
        // re-create exactly the "looks finished" illusion this parameter exists to
        // dispel.
        const warnings = [];
        const languageKey = language ? (0, messageClassXml_1.sapLanguageKey)(language) : undefined;
        const translationRead = language && languageKey
            ? await readTranslatedMsgnos(client, name, languageKey, logger)
            : undefined;
        const translatedNos = translationRead?.msgnos;
        if (language && !translatedNos) {
            warnings.push(`Which messages actually have a ${language} text could not be determined (the T100 ` +
                'read failed), so no translated flags and no counts are reported. The texts below ' +
                'are what ADT served, which silently substitutes the master-language text wherever ' +
                `no ${language} row exists. Confirm with GetSqlQuery: SELECT msgnr, sprsl FROM t100 ` +
                `WHERE arbgb = '${name}' AND sprsl = '${languageKey}'.`);
        }
        const messages = selected.map((m) => {
            const base = includeTexts
                ? { ...m }
                : { msgno: m.msgno, self_explanatory: m.self_explanatory };
            return translatedNos
                ? { ...base, translated: translatedNos.has((0, messageClassXml_1.normaliseMsgno)(m.msgno)) }
                : base;
        });
        const translatedCount = translatedNos
            ? selected.filter((m) => translatedNos.has((0, messageClassXml_1.normaliseMsgno)(m.msgno)))
                .length
            : undefined;
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                message_class_name: name,
                // Master (original) language from adtcore:masterLanguage — the
                // translation baseline, NOT adtcore:language (the response language).
                master_language: masterLanguage ?? null,
                ...(language
                    ? {
                        language,
                        language_key: languageKey,
                        // How many attempts the T100 read took: 1 = clean, 2 = the retry
                        // saved it. Reported because the retry that closed R4-F1 would
                        // otherwise erase its own telemetry — a single transient failure
                        // looks identical to a clean read, which makes the endpoint's
                        // flakiness unmeasurable from outside. Not a warning: the retry
                        // working is the good case.
                        ...(translationRead
                            ? {
                                t100_read_attempts: translationRead.attempts,
                                t100_read_retried: translationRead.attempts > 1,
                            }
                            : {}),
                        // Counts cover the RETURNED messages, so they stay consistent
                        // with from_msgno/to_msgno paging.
                        ...(translatedCount !== undefined
                            ? {
                                translated_count: translatedCount,
                                untranslated_count: messages.length - translatedCount,
                            }
                            : {}),
                    }
                    : {}),
                // The unfiltered total is always reported, so paging cannot make a
                // class look smaller than it is.
                message_count: all.length,
                returned_count: messages.length,
                ...(from || to
                    ? { from_msgno: from ?? null, to_msgno: to ?? null }
                    : {}),
                ...(warnings.length ? { warnings } : {}),
                messages,
                // Opt-in: the raw XML is what pushes a large class past the output limit.
                ...(args.include_raw_xml === true ? { raw_xml: xml } : {}),
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`Error reading message class ${args?.message_class_name}: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetMessageClass.js.map