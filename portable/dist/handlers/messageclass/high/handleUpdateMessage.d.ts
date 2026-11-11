/**
 * UpdateMessage — change one message's text or flag.
 *
 * The message list is read from SAP and written back with one entry changed, so
 * the caller never holds the messages it is not touching. See editMessageCore.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type MessageEditArgs } from './editMessageCore';
export declare const TOOL_DEFINITION: {
    readonly name: "UpdateMessage";
    readonly available_in: readonly ["onprem", "cloud", "legacy"];
    readonly description: string;
    readonly notes: "Parallelism. Every write to a message class takes the SAME lock on the WHOLE class, so\nconcurrent UpdateMessage calls against one class queue behind each other rather than running side by\nside. Measured by a reporting project rewriting 109 texts: 8 calls in parallel completed fine, 15 did\nnot — 2 of the 15 exceeded the client timeout, and those two had NOT been applied. Keep a batch on one\nclass at or below ~8 concurrent calls, or send them sequentially; the wall-clock difference is small\nbecause they serialise on the lock either way.\n\nA timeout here is not proof the write failed: the request was sent and SAP may still be holding the\nlock. Read the message back with GetMessageClass before re-sending. Raise SAP_TIMEOUT_DEFAULT\n(milliseconds, default 45000) if a class is large enough that single writes are slow.\n\nTranslations (the language parameter). Measured end to end on S/4HANA 2023 FPS02, acceptance test\n= T100 rows per language before and after, never an HTTP status.\n\n  * The row a text lands in is decided by the SESSION language, and the session's language is fixed\n    by the request that OPENS it — the LOCK. sap-language on the PUT alone only changes how the\n    response is rendered. Proven: on a connection pinned to EN, a lock carrying sap-language=ZH plus\n    the PUT wrote T100 SPRSL='1' and left SPRSL='E' byte-identical;\nthe;\nsame;\nPUT;\nwith the lock in EN\nwrote;\n('E');\ninstead.\n  * THE\nTRAP, which;\nis;\nwhy;\nthe;\npayload;\nis;\none;\nmessage;\nand;\nnot;\nthe;\nclass: a read in the target\n    language falls back to the MASTER text for every message that has no row there, so writing the\n    whole list back manufactures a target-language row holding the master text for every\n    untranslated message. Measured: updating 001 in ZH with the full list created a ZH row for 002\n    containing its English text. On a 109-message class that is 108 fabricated translations, which\n    is worse than none because the translation tools then treat them as done. UpdateMessageClass is\n    an UPSERT, so a one-message payload leaves the others alone — verified: message 003 gained no ZH\n    row.\n  * The tool verifies itself against T100 and REFUSES to report success if the master-language row\n    changed or disappeared. The class read cannot do this: ADT serves the master text when the\n    language has no row, so a \"successful\" read is exactly what a failed translation looks like.\n  * self_explanatory is refused alongside language — the flag belongs to the message, not to one\n    language. Adding a message in a non-master language is refused for the same reason: create it in\n    the master language first.\n\nWithout language the text is written in the session language, which this server pins to\nSAP_LANGUAGE (default EN).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly message_class_name: {
                readonly type: "string";
                readonly description: "Message class name (e.g., ZMY_MSGCLASS).";
            };
            readonly msgno: {
                readonly type: "string";
                readonly description: "Message number, 1-3 digits. Zero-padded automatically (\"7\" and \"007\" are the same message).";
            };
            readonly text: {
                readonly type: "string";
                readonly description: "New short text. Omit to keep the current text.";
            };
            readonly self_explanatory: {
                readonly type: "boolean";
                readonly description: "New self-explanatory flag. Omit to keep the current value.";
            };
            readonly transport_request: {
                readonly type: "string";
                readonly description: "Transport request, when the class is in a transportable package.";
            };
            readonly language: {
                readonly type: "string";
                readonly description: "ADT/ISO code (e.g. \"ZH\", \"DE\"). Omit for a normal edit. See Notes.";
            };
        };
        readonly required: readonly ["message_class_name", "msgno"];
    };
};
export declare function handleUpdateMessage(context: HandlerContext, args: MessageEditArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleUpdateMessage.d.ts.map