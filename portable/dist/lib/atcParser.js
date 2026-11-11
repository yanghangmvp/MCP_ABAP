"use strict";
/**
 * Shared parsing helpers for the ADT ATC (ABAP Test Cockpit) REST endpoints.
 * Used by handleRunAtc / handleGetAtcWorklist / handleGetAtcCustomizing.
 *
 * Field coverage aligned with abap-adt-api's atcWorklists parser
 * (quickfixInfo, processor, lastChangedBy, link, objectTypeId).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asArray = asArray;
exports.parseAtcXml = parseAtcXml;
exports.parseAtcCustomizing = parseAtcCustomizing;
exports.parseAtcWorklist = parseAtcWorklist;
exports.findingsByPriority = findingsByPriority;
exports.buildAtcRunBody = buildAtcRunBody;
/** Ensure a parsed XML node is always an array (fast-xml-parser collapses single children). */
function asArray(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
function parseAtcXml(xml) {
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
    });
    return parser.parse(xml);
}
/** Parse ATC customizing XML: properties + exemption reasons. */
function parseAtcCustomizing(customizingXml) {
    const parsed = parseAtcXml(customizingXml);
    const customizing = parsed?.customizing ?? {};
    const properties = {};
    for (const p of asArray(customizing.properties?.property)) {
        const name = p['@_name'];
        if (!name)
            continue;
        let value = p['@_value'];
        if (value === 'true')
            value = true;
        else if (value === 'false')
            value = false;
        properties[name] = value;
    }
    // some releases put it as a root attribute instead
    if (customizing['@_systemCheckVariant']) {
        properties.systemCheckVariant = String(customizing['@_systemCheckVariant']);
    }
    const exemption_reasons = asArray(customizing.exemption?.reasons?.reason).map((r) => ({
        id: String(r['@_id'] ?? ''),
        title: String(r['@_title'] ?? ''),
        justification_mandatory: r['@_justificationMandatory'] === 'true',
    }));
    return {
        properties,
        exemption_reasons,
        system_check_variant: properties.systemCheckVariant != null
            ? String(properties.systemCheckVariant)
            : null,
    };
}
/** Flatten an ATC worklist XML into object summaries + a findings array. */
function parseAtcWorklist(worklistXml) {
    const parsed = parseAtcXml(worklistXml);
    const worklist = parsed?.worklist;
    const objects = asArray(worklist?.objects?.object);
    const findings = [];
    const objectSummaries = [];
    for (const obj of objects) {
        const objFindings = asArray(obj.findings?.finding);
        objectSummaries.push({
            name: obj['@_name'],
            type: obj['@_type'],
            object_type_id: obj['@_objectTypeId'],
            package: obj['@_packageName'],
            uri: obj['@_uri'],
            author: obj['@_author'],
            finding_count: objFindings.length,
        });
        for (const f of objFindings) {
            const link = f.link ? (f.link['@_href'] ?? null) : null;
            findings.push({
                object_name: obj['@_name'],
                object_type: obj['@_type'],
                priority: Number(f['@_priority'] ?? 0),
                check_id: f['@_checkId'],
                check_title: f['@_checkTitle'],
                message_id: f['@_messageId'],
                message_title: f['@_messageTitle'],
                uri: f['@_uri'],
                location: f['@_location'],
                processor: f['@_processor'] || null,
                last_changed_by: f['@_lastChangedBy'] || null,
                quickfix_info: f['@_quickfixInfo'] || null,
                link,
                exemption_approval: f['@_exemptionApproval'] || null,
                exemption_kind: f['@_exemptionKind'] || null,
            });
        }
    }
    findings.sort((a, b) => a.priority - b.priority);
    return {
        worklist_id: worklist?.['@_id'] ?? null,
        worklist_timestamp: worklist?.['@_timestamp'] ?? null,
        object_set_is_complete: worklist?.['@_objectSetIsComplete'] != null
            ? worklist['@_objectSetIsComplete'] === 'true' ||
                worklist['@_objectSetIsComplete'] === true
            : null,
        objects: objectSummaries,
        findings,
    };
}
/** Summarize findings by priority (priority_1: n, ...). */
function findingsByPriority(findings) {
    const byPriority = {};
    for (const f of findings) {
        const key = `priority_${f.priority}`;
        byPriority[key] = (byPriority[key] ?? 0) + 1;
    }
    return byPriority;
}
/** Build the ATC run request XML for one or more object URIs. */
function buildAtcRunBody(objectUris, maxResults) {
    const refs = objectUris
        .map((u) => `        <adtcore:objectReference adtcore:uri="${u}"/>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<atc:run maximumVerdicts="${maxResults}" xmlns:atc="http://www.sap.com/adt/atc">
  <objectSets xmlns:adtcore="http://www.sap.com/adt/core">
    <objectSet kind="inclusive">
      <adtcore:objectReferences>
${refs}
      </adtcore:objectReferences>
    </objectSet>
  </objectSets>
</atc:run>`;
}
//# sourceMappingURL=atcParser.js.map