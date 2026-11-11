"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckDomain = handleCheckDomain;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckDomain_1 = require("../low/handleCheckDomain");
exports.TOOL_DEFINITION = {
    name: 'CheckDomain',
    available_in: ['onprem', 'cloud'],
    description: 'Perform syntax check on an ABAP domain. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            domain_name: {
                type: 'string',
                description: 'Domain name (e.g., ZDM_MY_DOMAIN).',
            },
        },
        required: ['domain_name'],
    },
};
async function handleCheckDomain(context, args) {
    const result = await (0, handleCheckDomain_1.handleCheckDomain)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.domain_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckDomain.js.map