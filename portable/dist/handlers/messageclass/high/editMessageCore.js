"use strict";
/**
 * Shared core for the single-message maintenance tools (AddMessage,
 * UpdateMessage).
 *
 * `UpdateMessageClass` replaces the whole message list, so adding one message to
 * a large class meant re-emitting every other message by hand. These three tools
 * read the current list from SAP, change one entry and write it back, so the
 * caller never holds the messages it is not changing — and therefore cannot lose
 * one. The result is verified by reading the class again.
 *
 * The tools live in their own files (one TOOL_DEFINITION per file, as everywhere
 * else in this repo) and share `editMessage` from here — the same split as
 * PublishServiceBinding / UnpublishServiceBinding.
 *
 * NO DeleteMessage TOOL EXISTS, and that is a finding rather than an omission.
 * Measured on DM2/310 (SAP_BASIS 7.58):
 *
 *   - `UpdateMessageClass` is an UPSERT, not a whole-set replace. PUTting the
 *     class with 2 of its 3 messages leaves all 3 in place. (Good news for the
 *     other operations: a message cannot be lost by being omitted. But it also
 *     means omission cannot delete one.)
 *   - PUTting a message with an EMPTY text clears `mc:msgtext` and keeps the row.
 *   - the per-message sub-resource `/messages/{no}` DOES exist — a GET answers
 *     200 with an empty `<msg:message/>` — but DELETE on it answers 423
 *     `ExceptionResourceInvalidLockHandle` whether the lock is taken on the
 *     sub-resource or on the message class.
 *
 * So removing a single message is not reachable through ADT on this release; it
 * needs SE91. A DeleteMessage tool would have been an enum value that can never
 * succeed, which is the failure mode this file exists to avoid.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSGNO_DESC = void 0;
exports.describeTranslation = describeTranslation;
exports.readT100Rows = readT100Rows;
exports.editMessage = editMessage;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const messageClassXml_1 = require("../../../lib/messageClassXml");
const sessionLanguage_1 = require("../../../lib/sessionLanguage");
const utils_1 = require("../../../lib/utils");
const handleGetSqlQuery_1 = require("../../system/readonly/handleGetSqlQuery");
exports.MSGNO_DESC = 'Message number, 1-3 digits. Zero-padded automatically ("7" and "007" are the same message).';
/**
 * The summary sentence for a translation write. Claims exactly what ran.
 *
 * When anything went into `warnings`, the sentence says so: a caller reading
 * only `message` must never be left with an assurance that the structured
 * fields contradict.
 */
function describeTranslation(className, msgno, language, masterLanguage, check, warningCount) {
    const master = `${masterLanguage ?? 'master'}-language text`;
    const head = `Message ${msgno} of ${className} translated into ${language}`;
    const body = check === 'verified_unchanged'
        ? `${head}; the ${master} was verified unchanged.`
        : check === 'not_verified'
            ? `${head}. The ${master} could NOT be verified — the T100 read failed. ` +
                'Confirm with GetSqlQuery before relying on this.'
            : `${head}. The ${master} is reported as it stands now, not proven unchanged.`;
    return warningCount > 0 ? `${body} See warnings.` : body;
}
async function readT100Rows(client, className, msgno, logger) {
    const sql = `SELECT sprsl, msgnr, text FROM t100 ` +
        `WHERE arbgb = '${className.replace(/'/g, "''")}' AND msgnr = '${msgno}'`;
    const attempt = async () => {
        const response = await client
            .getUtils()
            .getSqlQuery({ sql_query: sql, row_number: 100 });
        if (response?.status !== 200 || !response?.data)
            return undefined;
        const data = typeof response.data === 'string' ? response.data : String(response.data);
        const rows = (0, handleGetSqlQuery_1.parseSqlQueryXml)(data, sql, 100, logger).rows;
        return rows.map((row) => ({
            language: String(row.SPRSL ?? row.sprsl ?? ''),
            text: String(row.TEXT ?? row.text ?? ''),
        }));
    };
    // RETRIED ONCE (round 4, R4-F1). Measured by a reporting project over 109
    // consecutive translation writes: this read failed on 5 of them (4.6%),
    // scattered, same class and session, with their own direct reads of the same
    // rows succeeding in the same period. The read is idempotent and the write has
    // already happened by the time it runs, so a retry cannot do harm — and the
    // guard is the entire safety story, so degrading it to a warning is the
    // expensive outcome.
    let attempts = 0;
    for (let attemptNo = 0; attemptNo < 2; attemptNo++) {
        attempts = attemptNo + 1;
        try {
            const rows = await attempt();
            if (rows)
                return { rows, attempts };
        }
        catch (error) {
            logger?.debug?.(`T100 verification read failed (attempt ${attempts}): ${error?.message ?? error}`);
        }
    }
    // Never let the verification failure masquerade as a write failure.
    return { attempts };
}
async function editMessage(context, args, mode) {
    const { connection, logger } = context;
    try {
        if (!args?.message_class_name) {
            return (0, utils_1.return_error)(new Error('message_class_name is required'));
        }
        if (args?.msgno === undefined || String(args.msgno).trim() === '') {
            return (0, utils_1.return_error)(new Error('msgno is required'));
        }
        const msgno = (0, messageClassXml_1.normaliseMsgno)(args.msgno);
        if (!/^\d{3}$/.test(msgno)) {
            return (0, utils_1.return_error)(new Error(`msgno "${args.msgno}" is not a valid SAP message number (1-3 digits, 000-999).`));
        }
        if (mode === 'add' && !args.text) {
            return (0, utils_1.return_error)(new Error('text is required when adding a message.'));
        }
        if (mode === 'update' &&
            args.text === undefined &&
            args.self_explanatory === undefined) {
            return (0, utils_1.return_error)(new Error('Nothing to change. Pass text and/or self_explanatory.'));
        }
        const language = args.language?.trim().toUpperCase() || undefined;
        if (language && mode === 'add') {
            return (0, utils_1.return_error)(new Error('language is not accepted when ADDING a message. A translation can only be ' +
                'written for a message that already exists in the master language — add it ' +
                'first with AddMessage, then translate it with UpdateMessage.'));
        }
        if (language && !/^[A-Z]{1,2}$/.test(language)) {
            return (0, utils_1.return_error)(new Error(`language "${args.language}" is not a language key. Pass the ADT/ISO code, ` +
                'e.g. "ZH", "DE", "JA" — not the SAP one-character key.'));
        }
        if (language && args.self_explanatory !== undefined) {
            return (0, utils_1.return_error)(new Error('self_explanatory cannot be set in a translation write: the flag is a property ' +
                'of the message, not of one language. Set it in a separate call without language.'));
        }
        const client = (0, clients_1.createAdtClient)(connection, logger); // wraps the connection (sap-language pinning)
        const name = args.message_class_name.toUpperCase();
        const url = (0, messageClassXml_1.messageClassUri)(name);
        // Read the CURRENT list. This is what makes the operation safe: the caller
        // supplies one message, not the whole class.
        const currentXml = await (0, adtObjectOps_1.getAdt)(connection, url);
        const before = (0, messageClassXml_1.parseMessageEntries)(currentXml);
        const masterLanguage = (0, messageClassXml_1.parseMasterLanguage)(currentXml);
        if (language && masterLanguage && language === masterLanguage) {
            return (0, utils_1.return_error)(new Error(`language "${language}" is the master language of ${name}, so this is an ` +
                'ordinary edit — call UpdateMessage without language.'));
        }
        // Ground truth BEFORE the write, so the master-language row can be proven
        // untouched afterwards rather than assumed to be.
        const beforeRead = language
            ? await readT100Rows(client, name, msgno, logger)
            : undefined;
        const t100Before = beforeRead?.rows;
        let after;
        try {
            after = (0, messageClassXml_1.applyMessageEdit)(before, mode, msgno, args.text, args.self_explanatory);
        }
        catch (editError) {
            return (0, utils_1.return_error)(editError);
        }
        // A TRANSLATION write carries ONLY the message being translated, and is built
        // from a document read IN THE TARGET LANGUAGE.
        //
        // Two things had to be true, and each was found by measuring rather than by
        // reasoning about the protocol:
        //
        // 1. ONE MESSAGE, NOT THE LIST. A read in the target language falls back to
        //    the MASTER text for every message that has no row there, so writing the
        //    whole list back manufactures a target-language row holding the master
        //    text for every untranslated message. Measured on DM2/310: updating 001
        //    in ZH with the full list created a ZH row for 002 containing its English
        //    text — a fake translation, worse than none, because the translation
        //    tools then treat it as done. On a 109-message class that is 108 fakes.
        //    UpdateMessageClass is an UPSERT, so omitted messages are left alone —
        //    verified: message 003 gained no ZH row.
        //
        // 2. THE DOCUMENT MUST COME FROM A READ IN THAT LANGUAGE. Sending sap-language
        //    on every request of the write is NOT enough on its own: with the payload
        //    built from the master-language read, the write overwrote the
        //    master-language row even though lock, PUT and CSRF all carried ZH. The
        //    document's own adtcore:language is part of what SAP keys the text on, so
        //    the class is re-read inside the forced-language window and the payload
        //    is built from THAT.
        const restoreLanguage = language
            ? (0, utils_1.withForcedLanguage)(connection, language)
            : undefined;
        try {
            let writeXml = currentXml;
            if (language) {
                // TERMINATE any stateful server session an earlier write left on this
                // shared connection BEFORE taking the lock.
                //
                // Measured, and it is a corruption rather than a nuisance: a translation
                // write that FOLLOWS another write on the same connection lands in the
                // EARLIER session's language. Repro on DM2/310 — UpdateMessage in the
                // master language, then UpdateMessage with language: 'ZH', same
                // connection: the Chinese text overwrote the ENGLISH row. The same two
                // writes on two connections behave correctly.
                //
                // Cause is the round-1 P4 finding: runLocked's closing
                // setSessionMode('stateless') only OMITS the session header, it does NOT
                // end the server session — so the lock below JOINS the old session
                // instead of opening a new one in the target language. Sending an
                // EXPLICIT `x-sap-adt-sessiontype: stateless` header does end it, which
                // is what this wrapper is for. One request carrying it is enough, and
                // the target-language re-read is that request.
                const restoreStateless = (0, utils_1.withExplicitStatelessHeader)(connection);
                try {
                    writeXml = await (0, adtObjectOps_1.getAdt)(connection, url);
                }
                finally {
                    restoreStateless();
                }
            }
            const body = language
                ? (0, messageClassXml_1.buildMessageClassDocument)(writeXml, after.filter((m) => (0, messageClassXml_1.normaliseMsgno)(m.msgno) === msgno))
                : (0, messageClassXml_1.buildMessageClassDocument)(writeXml, after);
            await (0, adtObjectOps_1.runLocked)(connection, url, async (lockHandle) => {
                await (0, adtObjectOps_1.putAdtContent)(connection, url, body, lockHandle, args.transport_request, language);
            }, language, logger);
        }
        finally {
            restoreLanguage?.();
        }
        // VERIFY against SAP rather than reporting the intent. A message class is
        // active on save, so the read reflects the stored state immediately.
        const verifyXml = await (0, adtObjectOps_1.getAdt)(connection, url, language ? { 'sap-language': language } : undefined);
        const stored = (0, messageClassXml_1.parseMessageEntries)(verifyXml);
        const entry = stored.find((m) => (0, messageClassXml_1.normaliseMsgno)(m.msgno) === msgno);
        if (!entry) {
            return (0, utils_1.return_error)(new Error(`Message ${msgno} is not present in ${name} after the write. ` +
                'The change did not take effect.'));
        }
        else if (args.text !== undefined && entry.text !== args.text) {
            return (0, utils_1.return_error)(new Error(`Message ${msgno} of ${name} reads "${entry.text}" but "${args.text}" was ` +
                'requested. SAP may have truncated the text (the limit is 73 characters).'));
        }
        // The self-explanatory flag does not always take. Measured on DM2/310:
        // asking for false on a message with no long text (mc:documented="false")
        // leaves it true — SAP appears to require a long text before a message may
        // be non-self-explanatory. Reporting success while the requested flag was
        // not stored would be the same "reports intent, not outcome" defect this
        // handler is built to avoid, so say so.
        const flagWarnings = [];
        if (entry &&
            args.self_explanatory !== undefined &&
            entry.self_explanatory !== args.self_explanatory) {
            flagWarnings.push(`self_explanatory was requested as ${args.self_explanatory} but SAP stored ` +
                `${entry.self_explanatory}. SAP keeps a message self-explanatory while it has no ` +
                'long text; maintain the long text in SE91 first if the flag has to change.');
        }
        // A lost message is the failure mode this tool exists to prevent, so count.
        const expectedCount = mode === 'add' ? before.length + 1 : before.length;
        const warnings = [
            ...flagWarnings,
            ...(stored.length === expectedCount
                ? []
                : [
                    `The class now holds ${stored.length} message(s) but ${expectedCount} were ` +
                        `expected (it held ${before.length} before). Compare with GetMessageClass.`,
                ]),
        ];
        // TRANSLATION ACCEPTANCE TEST, run by the tool itself.
        //
        // The class read above cannot prove a translation: ADT serves the master text
        // when the requested language has no row, so a "successful" read is exactly
        // what a failed translation looks like. T100 is the only witness. Two things
        // are checked, and both are the reporting project's own conditions: a row
        // must exist in the requested language carrying the requested text, and the
        // MASTER-language row must be byte-identical to what it was before.
        let t100Report;
        // What the guard ACTUALLY established about the master-language row. The
        // summary sentence is derived from this and from nothing else.
        let masterCheck = 'verified_unchanged';
        let t100Attempts;
        if (language) {
            const afterRead = await readT100Rows(client, name, msgno, logger);
            const t100After = afterRead.rows;
            // Attempt counts for BOTH reads, so a caller can total the underlying
            // endpoint's first-attempt failure rate across a run — see T100ReadResult.
            t100Attempts = {
                before: beforeRead?.attempts ?? 0,
                after: afterRead.attempts,
            };
            if (!t100After) {
                masterCheck = 'not_verified';
                warnings.push('The translation could not be verified against T100 (the Data Preview read ' +
                    'failed), so this reports the write only. Confirm with ' +
                    `GetSqlQuery: SELECT sprsl, text FROM t100 WHERE arbgb = '${name}' AND msgnr = '${msgno}'.`);
            }
            else {
                const master = masterLanguage
                    ? t100Before?.find((r) => r.language === (0, messageClassXml_1.sapLanguageKey)(masterLanguage))
                    : undefined;
                const masterNow = masterLanguage
                    ? t100After.find((r) => r.language === (0, messageClassXml_1.sapLanguageKey)(masterLanguage))
                    : undefined;
                // Located by LANGUAGE KEY, not by text: a translation that happens to
                // equal the master text is still a translation, and matching on text
                // would report it missing.
                const written = t100After.find((r) => r.language === (0, messageClassXml_1.sapLanguageKey)(language));
                t100Report = {
                    rows_before: t100Before?.length ?? null,
                    rows_after: t100After.length,
                    rows: t100After.map((r) => ({
                        sprsl: r.language,
                        text: r.text,
                    })),
                };
                if (master && masterNow && master.text !== masterNow.text) {
                    return (0, utils_1.return_error)(new Error(`The ${masterLanguage} master-language text of ${name} ${msgno} CHANGED during a ` +
                        `translation write (was "${master.text}", now "${masterNow.text}"). ` +
                        'This is the failure this parameter exists to prevent — restore it with ' +
                        'UpdateMessage without language, and do not use language on this system.'));
                }
                if (master && !masterNow) {
                    return (0, utils_1.return_error)(new Error(`The ${masterLanguage} master-language row of ${name} ${msgno} DISAPPEARED during a ` +
                        'translation write. Restore it with UpdateMessage without language.'));
                }
                if (!written) {
                    warnings.push(`No T100 row exists for language ${language} (SPRSL '${(0, messageClassXml_1.sapLanguageKey)(language)}') ` +
                        'after the write. The write reported success but the translation was not ' +
                        'stored; compare the rows listed under t100.');
                }
                else if (args.text !== undefined && written.text !== args.text) {
                    warnings.push(`The ${language} row of ${name} ${msgno} reads "${written.text}" but ` +
                        `"${args.text}" was requested (SAP truncates at 73 characters).`);
                }
                if (!t100Before) {
                    masterCheck = 'not_proven';
                    warnings.push('The T100 rows could not be read BEFORE the write, so the master-language ' +
                        'text is reported as it stands now rather than proven unchanged.');
                }
                else if (!master) {
                    // The before-read succeeded but held no row for the master language.
                    // Nothing was compared, so nothing may be claimed — this also catches a
                    // wrong ADT-code -> SPRSL mapping instead of silently passing.
                    masterCheck = 'not_proven';
                    warnings.push(`No ${masterLanguage ?? 'master'}-language row was found in T100 before the write ` +
                        `(looked for SPRSL '${masterLanguage ? (0, messageClassXml_1.sapLanguageKey)(masterLanguage) : '?'}'), ` +
                        'so the master text is reported as it stands now rather than proven unchanged.');
                }
            }
        }
        // THE NO-LANGUAGE PATH IS GUARDED TOO (round 5, at the reporter's ask).
        //
        // Their argument, and it is right: the path with no explicit intent was the
        // path with no verification. A plain edit can land in a TRANSLATION row —
        // measured, before the refusal in lib/sessionLanguage closed the known cause
        // — and it is reported as success, because the class read serves whatever
        // the session language is and therefore agrees with itself.
        //
        // One extra T100 read, only when there is a text to locate. It asks the only
        // question that matters: did the text land in the language this write was
        // supposed to be in?
        if (!language && args.text !== undefined) {
            const target = (0, sessionLanguage_1.defaultWriteLanguage)();
            const targetKey = (0, messageClassXml_1.sapLanguageKey)(target);
            const plainRead = await readT100Rows(client, name, msgno, logger);
            if (!plainRead.rows) {
                warnings.push(`Which language row this text landed in could not be verified (the T100 read ` +
                    `failed). Confirm with GetSqlQuery: SELECT sprsl, text FROM t100 WHERE ` +
                    `arbgb = '${name}' AND msgnr = '${msgno}'.`);
            }
            else {
                const landed = plainRead.rows.filter((r) => r.text === args.text);
                if (landed.length && !landed.some((r) => r.language === targetKey)) {
                    return (0, utils_1.return_error)(new Error(`Message ${msgno} of ${name} was written into the ${landed
                        .map((r) => `SPRSL '${r.language}'`)
                        .join(', ')} row instead of the ${target} row (SPRSL '${targetKey}'). ` +
                        'That is a TRANSLATION row, not the text you meant to change. This happens ' +
                        'when the connection has already written in another language; restart the ' +
                        'server to get a fresh connection, then repair both rows.'));
                }
            }
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                message_class_name: name,
                msgno,
                operation: mode,
                ...(entry
                    ? { text: entry.text, self_explanatory: entry.self_explanatory }
                    : {}),
                message_count_before: before.length,
                message_count_after: stored.length,
                ...(language
                    ? {
                        language,
                        master_language: masterLanguage ?? null,
                        // R4-D1: the machine-readable twin of the sentence below, so a
                        // caller never has to parse prose to learn what was checked.
                        master_language_check: masterCheck,
                        ...(t100Attempts
                            ? {
                                t100_read_attempts: t100Attempts,
                                // True when at least one of the two reads needed its retry.
                                // Not a warning: the retry doing its job is the good case.
                                // It is here so the endpoint's flakiness stays measurable.
                                t100_read_retried: t100Attempts.before > 1 || t100Attempts.after > 1,
                            }
                            : {}),
                        ...(t100Report ? { t100: t100Report } : {}),
                    }
                    : {}),
                ...(warnings.length ? { warnings } : {}),
                message: language
                    ? describeTranslation(name, msgno, language, masterLanguage, masterCheck, warnings.length)
                    : `Message ${msgno} of ${name} ${mode === 'add' ? 'added' : 'updated'}; the other ${stored.length - 1} message(s) were preserved.`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        const bodyText = error?.response?.data
            ? typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
            : '';
        const msg = `Failed to ${mode} message ${args?.msgno} in ${args?.message_class_name}: ` +
            `${error instanceof Error ? error.message : String(error)}` +
            (bodyText ? ` | ADT: ${bodyText.slice(0, 800)}` : '');
        logger?.error(msg);
        return (0, utils_1.return_error)(new Error(msg));
    }
}
//# sourceMappingURL=editMessageCore.js.map