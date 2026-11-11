"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.positionFromHref = positionFromHref;
exports.parseCheckRunResponse = parseCheckRunResponse;
const fast_xml_parser_1 = require("fast-xml-parser");
/**
 * ADT reports a check message's position ONLY in the fragment of its
 * `chkrun:uri`, e.g. `/sap/bc/adt/oo/classes/zcl_x/source/main#start=42,7`.
 * There is no `line` attribute on the element, so the `line` field was
 * effectively always undefined and every consumer dropped the position.
 *
 * That is the whole of field report round-3 K-3: a caller receives
 * `Field "IO_OUT" is unknown.` twelve times with no positions, and the only way
 * forward is to re-read the source, guess, and re-send the entire object. The
 * reporter measured 55 such blind re-sends — 661 KB, ~169k tokens — in one
 * project.
 */
function positionFromHref(href) {
    if (!href)
        return {};
    const match = /#start=(\d+)(?:,(\d+))?/.exec(href);
    if (!match)
        return {};
    const line = Number(match[1]);
    const column = match[2] === undefined ? undefined : Number(match[2]);
    return {
        line: Number.isFinite(line) ? line : undefined,
        column: Number.isFinite(column) ? column : undefined,
    };
}
function parseCheckRunResponse(response) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
    });
    try {
        const data = typeof response.data === 'string'
            ? response.data
            : response.data?.toString?.() || '';
        const result = parser.parse(data);
        const checkReport = result['chkrun:checkRunReports']?.['chkrun:checkReport'] ??
            result.checkRunReports?.checkReport ??
            result['chkrun:checkReport'] ??
            result.checkReport;
        if (!checkReport) {
            return {
                success: true,
                status: 'no_report',
                message: 'No check report in response (no issues reported)',
                errors: [],
                warnings: [],
                info: [],
                total_messages: 0,
                has_errors: false,
                has_warnings: false,
            };
        }
        const status = checkReport['@_chkrun:status'] ||
            checkReport['chkrun:status'] ||
            checkReport['@_status'] ||
            checkReport.status ||
            'unknown';
        const statusText = checkReport['chkrun:statusText'] ||
            checkReport['@_chkrun:statusText'] ||
            checkReport.statusText ||
            checkReport['@_statusText'] ||
            '';
        const messages = checkReport['chkrun:checkMessageList']?.['chkrun:checkMessage'] ??
            checkReport.checkMessageList?.checkMessage ??
            checkReport['chkrun:messages']?.msg ??
            checkReport.messages?.msg ??
            checkReport['chkrun:messages'] ??
            checkReport.messages ??
            [];
        const messageArray = Array.isArray(messages)
            ? messages
            : messages
                ? [messages]
                : [];
        const errors = [];
        const warnings = [];
        const info = [];
        messageArray.forEach((msg) => {
            if (!msg || typeof msg !== 'object') {
                return;
            }
            const msgType = msg['@_chkrun:type'] || msg['@_type'] || msg.type || 'I';
            const shortText = msg['@_chkrun:shortText'] ||
                msg.shortText?.['#text'] ||
                msg.shortText?.txt ||
                msg.shortText ||
                '';
            const line = msg['@_line'] || msg.line;
            const href = msg['@_chkrun:uri'] || msg['@_href'] || msg.href;
            const bucket = msgType === 'E' ? errors : msgType === 'W' ? warnings : info;
            const pos = positionFromHref(typeof href === 'string' ? href : undefined);
            bucket.push({
                type: msgType,
                text: shortText,
                line: line ?? pos.line,
                column: pos.column,
                href,
            });
        });
        const hasErrors = errors.length > 0 || status === 'notProcessed';
        const success = status === 'processed' && errors.length === 0;
        return {
            success,
            status,
            message: statusText,
            errors,
            warnings,
            info,
            total_messages: messageArray.length,
            has_errors: hasErrors,
            has_warnings: warnings.length > 0,
        };
    }
    catch (error) {
        return {
            success: false,
            status: 'parse_error',
            message: `Failed to parse check run response: ${error}`,
            errors: [],
            warnings: [],
            info: [],
            total_messages: 0,
            has_errors: false,
            has_warnings: false,
        };
    }
}
//# sourceMappingURL=checkRunParser.js.map