"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASS_INCLUDE_PARTS = void 0;
exports.readSourceUnits = readSourceUnits;
exports.createSourceReaderDeps = createSourceReaderDeps;
const fast_xml_parser_1 = require("fast-xml-parser");
const clients_1 = require("../clients");
const utils_1 = require("../utils");
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
exports.CLASS_INCLUDE_PARTS = [
    'definitions',
    'implementations',
    'testclasses',
    'macros',
];
/** Classic ABAP names, so an ABAPer recognises the unit in a hit. */
const CLASS_INCLUDE_LABEL = {
    definitions: 'CCDEF',
    implementations: 'CCIMP',
    testclasses: 'CCAU',
    macros: 'CCMAC',
};
function splitLines(text) {
    return text.split(/\r?\n/);
}
async function safe(op, logger, desc, onFailure) {
    try {
        return await op();
    }
    catch (e) {
        const reason = String(e?.message ?? e);
        logger?.debug?.(`[search-source] ${desc} failed: ${reason}`);
        // A swallowed read failure looks exactly like "no match in this object".
        // Hand it back so the scan can say what it could not read.
        onFailure?.(reason);
        return null;
    }
}
function isViewFm(name) {
    return name.length >= 4 && name.slice(0, 4).toUpperCase() === 'VIEW';
}
function sortFugrChildren(children) {
    return [...children].sort((a, b) => {
        if (a.objecttype !== b.objecttype)
            return a.objecttype < b.objecttype ? -1 : 1;
        return a.objectname < b.objectname ? -1 : 1;
    });
}
async function* readSourceUnits(deps, target, version = 'active', options = {}) {
    const logger = deps.logger;
    const fail = (unit) => (reason) => options.onReadFailure?.({
        object_name: target.object_name,
        unit,
        reason,
    });
    switch (target.object_type) {
        case 'PROG': {
            const src = await safe(() => deps.readProgram(target.object_name, version), logger, `read PROG ${target.object_name}`, fail(target.object_name));
            if (src !== null && src !== undefined) {
                yield { include: target.object_name, lines: splitLines(src) };
            }
            return;
        }
        case 'CLAS': {
            const src = await safe(() => deps.readClassMain(target.object_name, version), logger, `read CLAS ${target.object_name}`, fail(target.object_name));
            if (src !== null && src !== undefined) {
                yield { include: target.object_name, lines: splitLines(src) };
            }
            // The method bodies of local classes, the unit tests and the macros are
            // NOT in source/main — see CLASS_INCLUDE_PARTS. Reading main alone is how
            // a 89-line RAP handler gets reported as a 7-line object with no hits.
            if (options.classIncludes === false || !deps.readClassInclude)
                return;
            for (const part of exports.CLASS_INCLUDE_PARTS) {
                const unit = `${target.object_name} (${CLASS_INCLUDE_LABEL[part]})`;
                const includeSrc = await safe(
                // biome-ignore lint/style/noNonNullAssertion: guarded above
                () => deps.readClassInclude(target.object_name, part, version), logger, `read CLAS ${unit}`, fail(unit));
                if (includeSrc !== null && includeSrc !== undefined) {
                    yield { include: unit, lines: splitLines(includeSrc) };
                }
            }
            return;
        }
        case 'FUGR': {
            const children = await safe(() => deps.fetchFugrStructure(target.object_name), logger, `fetch FUGR structure ${target.object_name}`, fail(`${target.object_name} (structure)`));
            if (!children)
                return;
            const seen = new Set();
            const filtered = [];
            for (const c of children) {
                if (c.objecttype === 'FUGR/FF' && isViewFm(c.objectname))
                    continue;
                if (!c.objecttype.startsWith('FUGR/'))
                    continue;
                const key = `${c.objecttype}|${c.objectname}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                filtered.push(c);
            }
            const ordered = sortFugrChildren(filtered);
            for (const c of ordered) {
                const src = c.objecttype === 'FUGR/FF'
                    ? await safe(() => deps.readFugrFm(target.object_name, c.objectname), logger, `read FUGR/FF ${target.object_name}/${c.objectname}`, fail(c.objectname))
                    : await safe(() => deps.readInclude(c.objectname), logger, `read FUGR include ${c.objectname}`, fail(c.objectname));
                if (src !== null && src !== undefined) {
                    yield { include: c.objectname, lines: splitLines(src) };
                }
            }
            return;
        }
    }
}
function parseFugrChildrenFromXml(xml) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
    });
    const parsed = parser.parse(xml);
    let nodes = parsed?.['projectexplorer:objectstructure']?.['projectexplorer:node'];
    if (!nodes)
        return [];
    if (!Array.isArray(nodes))
        nodes = [nodes];
    const out = [];
    for (const node of nodes) {
        if (!node.objecttype || !node.objectname)
            continue;
        if (!node.objecttype.startsWith('FUGR/'))
            continue;
        out.push({ objecttype: node.objecttype, objectname: node.objectname });
    }
    return out;
}
function createSourceReaderDeps(ctx) {
    const client = (0, clients_1.createAdtClient)(ctx.connection, ctx.logger);
    return {
        async readProgram(programName, version) {
            const r = await client.getProgram().read({ programName }, version);
            const data = r?.readResult?.data;
            return typeof data === 'string' ? data : null;
        },
        async readInclude(includeName) {
            const r = await (0, utils_1.makeAdtRequestWithTimeout)(ctx.connection, `/sap/bc/adt/programs/includes/${(0, utils_1.encodeSapObjectName)(includeName)}/source/main`, 'GET', 'default');
            return typeof r?.data === 'string' ? r.data : null;
        },
        async readClassMain(className, version) {
            const r = await client.getClass().read({ className }, version);
            const data = r?.readResult?.data;
            return typeof data === 'string' ? data : null;
        },
        async readClassInclude(className, part, version) {
            // /includes/{part} is a separate ADT resource from /source/main; the
            // version selector is the same query parameter the class source uses.
            const r = await (0, utils_1.makeAdtRequestWithTimeout)(ctx.connection, `/sap/bc/adt/oo/classes/${(0, utils_1.encodeSapObjectName)(className.toLowerCase())}/includes/${part}` +
                (version === 'inactive' ? '?version=inactive' : ''), 'GET', 'default');
            return typeof r?.data === 'string' ? r.data : null;
        },
        async fetchFugrStructure(fugrName) {
            const r = await client.getUtils().getObjectStructure('FUGR/F', fugrName);
            return typeof r?.data === 'string'
                ? parseFugrChildrenFromXml(r.data)
                : [];
        },
        async readFugrFm(fugrName, fmName) {
            const r = await (0, utils_1.makeAdtRequestWithTimeout)(ctx.connection, `/sap/bc/adt/functions/groups/${(0, utils_1.encodeSapObjectName)(fugrName.toLowerCase())}/fmodules/${(0, utils_1.encodeSapObjectName)(fmName.toLowerCase())}/source/main`, 'GET', 'default');
            return typeof r?.data === 'string' ? r.data : null;
        },
        logger: ctx.logger,
    };
}
//# sourceMappingURL=sourceReader.js.map