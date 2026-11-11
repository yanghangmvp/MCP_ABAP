"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerListener = createServerListener;
exports.getProtocol = getProtocol;
const fs = __importStar(require("node:fs"));
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
/**
 * Create HTTP or HTTPS server based on TLS configuration.
 *
 * When `tls` is provided with cert + key paths, creates an HTTPS server.
 * Otherwise creates a plain HTTP server.
 *
 * @param app - Express application (or any http.RequestListener)
 * @param tls - Optional TLS configuration with file paths
 * @returns http.Server or https.Server
 */
function createServerListener(app, tls) {
    if (!tls) {
        return http.createServer(app);
    }
    if (!fs.existsSync(tls.cert)) {
        throw new Error(`TLS cert file not found: ${tls.cert}`);
    }
    if (!fs.existsSync(tls.key)) {
        throw new Error(`TLS key file not found: ${tls.key}`);
    }
    if (tls.ca && !fs.existsSync(tls.ca)) {
        throw new Error(`TLS CA file not found: ${tls.ca}`);
    }
    const tlsOptions = {
        cert: fs.readFileSync(tls.cert),
        key: fs.readFileSync(tls.key),
        ...(tls.ca && { ca: fs.readFileSync(tls.ca) }),
    };
    return https.createServer(tlsOptions, app);
}
/**
 * Returns the protocol string based on TLS configuration.
 */
function getProtocol(tls) {
    return tls ? 'https' : 'http';
}
//# sourceMappingURL=tlsUtils.js.map