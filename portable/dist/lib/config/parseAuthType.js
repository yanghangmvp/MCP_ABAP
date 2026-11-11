"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAuthType = parseAuthType;
/** Resolve SAP auth type from env. SAP_JWT_TOKEN forces jwt; SAP_AUTH_TYPE is explicit; default basic. */
function parseAuthType(env) {
    if (env.SAP_JWT_TOKEN)
        return 'jwt';
    const raw = env.SAP_AUTH_TYPE?.trim().toLowerCase();
    if (!raw)
        return 'basic';
    if (raw === 'xsuaa')
        return 'jwt';
    if (raw === 'basic' ||
        raw === 'jwt' ||
        raw === 'saml' ||
        raw === 'certificate' ||
        raw === 'kerberos') {
        return raw;
    }
    return 'basic';
}
//# sourceMappingURL=parseAuthType.js.map