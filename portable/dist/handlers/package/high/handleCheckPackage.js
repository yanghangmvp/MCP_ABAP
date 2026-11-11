"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCheckPackage = handleCheckPackage;
const normalizeCheckResponse_1 = require("../../../lib/normalizeCheckResponse");
const handleCheckPackage_1 = require("../low/handleCheckPackage");
exports.TOOL_DEFINITION = {
    name: 'CheckPackage',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: 'Perform syntax check on an ABAP package. Returns syntax errors, warnings, and messages.',
    inputSchema: {
        type: 'object',
        properties: {
            package_name: {
                type: 'string',
                description: 'Package name (e.g., ZMY_PACKAGE).',
            },
            super_package: {
                type: 'string',
                description: 'Super package name (parent package).',
            },
        },
        required: ['package_name', 'super_package'],
    },
};
async function handleCheckPackage(context, args) {
    const result = await (0, handleCheckPackage_1.handleCheckPackage)(context, args);
    return (0, normalizeCheckResponse_1.normalizeCheckResponse)(result, args.package_name?.toUpperCase());
}
//# sourceMappingURL=handleCheckPackage.js.map