"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCertKerberosFields = applyCertKerberosFields;
/**
 * Populate auth-type-specific fields on a SapConfig from env.
 * Returns true if it handled the auth type (so the caller skips the basic user/pass requirement).
 * Handles: certificate, kerberos. Returns false for basic/saml (caller handles those).
 */
function applyCertKerberosFields(config, env) {
    if (config.authType === 'certificate') {
        if (env.SAP_CERT_PATH)
            config.certPath = env.SAP_CERT_PATH.trim();
        if (env.SAP_CERT_KEY_PATH)
            config.certKeyPath = env.SAP_CERT_KEY_PATH.trim();
        if (env.SAP_CERT_PFX_PATH)
            config.certPfxPath = env.SAP_CERT_PFX_PATH.trim();
        if (env.SAP_CERT_PASSPHRASE)
            config.certPassphrase = env.SAP_CERT_PASSPHRASE; // no trim — passphrase may contain meaningful whitespace
        return true;
    }
    if (config.authType === 'kerberos') {
        if (env.SAP_KERBEROS_SPN)
            config.kerberosSpn = env.SAP_KERBEROS_SPN.trim();
        if (env.SAP_KERBEROS_SERVICE)
            config.kerberosService = env.SAP_KERBEROS_SERVICE.trim();
        return true;
    }
    return false;
}
//# sourceMappingURL=applyAuthFields.js.map