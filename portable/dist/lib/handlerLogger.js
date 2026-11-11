"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noopLogger = void 0;
exports.getHandlerLogger = getHandlerLogger;
/**
 * Create a prefixed logger for handlers.
 * Honors AUTH_LOG_LEVEL from @mcp-abap-adt/logger; set to "error"/"warn"/"info"/"debug".
 * Use HANDLER_LOG_SILENT=true to force no-op logger for handlers.
 */
function getHandlerLogger(category, baseLogger) {
    if (process.env.HANDLER_LOG_SILENT === 'true') {
        return exports.noopLogger;
    }
    const resolvedLogger = baseLogger ?? exports.noopLogger;
    const prefix = `[${category}]`;
    const wrap = (fn) => (msg) => fn(`${prefix} ${msg}`);
    return {
        info: wrap(resolvedLogger?.info.bind(resolvedLogger)),
        debug: wrap(resolvedLogger?.debug.bind(resolvedLogger)),
        warn: wrap(resolvedLogger?.warn.bind(resolvedLogger)),
        error: wrap(resolvedLogger?.error.bind(resolvedLogger)),
    };
}
const noopFn = () => { };
exports.noopLogger = {
    info: noopFn,
    debug: noopFn,
    warn: noopFn,
    error: noopFn,
};
//# sourceMappingURL=handlerLogger.js.map