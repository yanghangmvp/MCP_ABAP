"use strict";
/**
 * GetLockObject Handler - Read an ABAP lock object (ENQU).
 * ADT: GET /sap/bc/adt/ddic/lockobjects/sources/{name}. No adt-clients wrapper.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetLockObject = handleGetLockObject;
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetLockObject',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Operation: Read. Subject: LockObject (ENQU). Retrieve an ABAP lock object: primary table, lock mode, RFC flag, generated ENQUEUE/DEQUEUE modules.',
    inputSchema: {
        type: 'object',
        properties: {
            lock_object_name: {
                type: 'string',
                description: 'Lock object name (e.g., EZMY_LOCK).',
            },
            version: {
                type: 'string',
                description: 'Version to read: "active" (default) or "inactive".',
                enum: ['active', 'inactive'],
            },
        },
        required: ['lock_object_name'],
    },
};
async function handleGetLockObject(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.lock_object_name)
            return (0, utils_1.return_error)(new Error('lock_object_name is required'));
        (0, clients_1.createAdtClient)(connection, logger); // wrap connection (sap-language pinning)
        const name = args.lock_object_name.toUpperCase();
        const url = `/sap/bc/adt/ddic/lockobjects/sources/${(0, utils_1.encodeSapObjectName)(name).toLowerCase()}`;
        const xml = await (0, adtObjectOps_1.getAdt)(connection, url, args.version ? { version: args.version } : undefined);
        const primaryTable = xml.match(/<enqu:primaryTable>\s*<enqu:tableName>([^<]*)<\/enqu:tableName>\s*<enqu:lockMode>([^<]*)<\/enqu:lockMode>/);
        const parsed = {
            primary_table: primaryTable?.[1],
            lock_mode: primaryTable?.[2],
            allow_rfc: /<enqu:allowRFC>true<\/enqu:allowRFC>/.test(xml),
            lock_modules: Array.from(xml.matchAll(/<enqu:lockModule[^>]*adtcore:name="([^"]*)"/g)).map((m) => m[1]),
        };
        return (0, utils_1.return_response)({
            data: JSON.stringify({ success: true, lock_object_name: name, ...parsed, raw_xml: xml }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`Error reading lock object ${args?.lock_object_name}: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetLockObject.js.map