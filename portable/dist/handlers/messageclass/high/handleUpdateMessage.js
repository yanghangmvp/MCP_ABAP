"use strict";
/**
 * UpdateMessage — change one message's text or flag.
 *
 * The message list is read from SAP and written back with one entry changed, so
 * the caller never holds the messages it is not touching. See editMessageCore.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleUpdateMessage = handleUpdateMessage;
const editMessageCore_1 = require("./editMessageCore");
exports.TOOL_DEFINITION = {
    name: 'UpdateMessage',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Update. Subject: One message in a message class (SE91). Change a single ' +
        'message’s text or self-explanatory flag, leaving every other message untouched. Fails if ' +
        'the message number does not exist. Pass language to write a TRANSLATION instead: the ' +
        'master-language row is verified unchanged against T100 and the call fails if it moved.',
    notes: `Parallelism. Every write to a message class takes the SAME lock on the WHOLE class, so
concurrent UpdateMessage calls against one class queue behind each other rather than running side by
side. Measured by a reporting project rewriting 109 texts: 8 calls in parallel completed fine, 15 did
not — 2 of the 15 exceeded the client timeout, and those two had NOT been applied. Keep a batch on one
class at or below ~8 concurrent calls, or send them sequentially; the wall-clock difference is small
because they serialise on the lock either way.

A timeout here is not proof the write failed: the request was sent and SAP may still be holding the
lock. Read the message back with GetMessageClass before re-sending. Raise SAP_TIMEOUT_DEFAULT
(milliseconds, default 45000) if a class is large enough that single writes are slow.

Translations (the language parameter). Measured end to end on S/4HANA 2023 FPS02, acceptance test
= T100 rows per language before and after, never an HTTP status.

  * The row a text lands in is decided by the SESSION language, and the session's language is fixed
    by the request that OPENS it — the LOCK. sap-language on the PUT alone only changes how the
    response is rendered. Proven: on a connection pinned to EN, a lock carrying sap-language=ZH plus
    the PUT wrote T100 SPRSL='1' and left SPRSL='E' byte-identical;
the;
same;
PUT;
with the lock in EN
wrote;
('E');
instead.
  * THE
TRAP, which;
is;
why;
the;
payload;
is;
one;
message;
and;
not;
the;
class: a read in the target
    language falls back to the MASTER text for every message that has no row there, so writing the
    whole list back manufactures a target-language row holding the master text for every
    untranslated message. Measured: updating 001 in ZH with the full list created a ZH row for 002
    containing its English text. On a 109-message class that is 108 fabricated translations, which
    is worse than none because the translation tools then treat them as done. UpdateMessageClass is
    an UPSERT, so a one-message payload leaves the others alone — verified: message 003 gained no ZH
    row.
  * The tool verifies itself against T100 and REFUSES to report success if the master-language row
    changed or disappeared. The class read cannot do this: ADT serves the master text when the
    language has no row, so a "successful" read is exactly what a failed translation looks like.
  * self_explanatory is refused alongside language — the flag belongs to the message, not to one
    language. Adding a message in a non-master language is refused for the same reason: create it in
    the master language first.

Without language the text is written in the session language, which this server pins to
SAP_LANGUAGE (default EN).`,
    inputSchema: {
        type: 'object',
        properties: {
            message_class_name: {
                type: 'string',
                description: 'Message class name (e.g., ZMY_MSGCLASS).',
            },
            msgno: { type: 'string', description: editMessageCore_1.MSGNO_DESC },
            text: {
                type: 'string',
                description: 'New short text. Omit to keep the current text.',
            },
            self_explanatory: {
                type: 'boolean',
                description: 'New self-explanatory flag. Omit to keep the current value.',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request, when the class is in a transportable package.',
            },
            language: {
                type: 'string',
                description: 'ADT/ISO code (e.g. "ZH", "DE"). Omit for a normal edit. See Notes.',
            },
        },
        required: ['message_class_name', 'msgno'],
    },
};
function handleUpdateMessage(context, args) {
    return (0, editMessageCore_1.editMessage)(context, args, 'update');
}
//# sourceMappingURL=handleUpdateMessage.js.map