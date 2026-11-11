"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleReadProgram = handleReadProgram;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'ReadProgram',
    available_in: ['onprem', 'legacy'],
    description: '[read-only] Read a MAIN ABAP program (report) source code and metadata by name. Works ONLY for main programs (adtcore type PROG/P); NOT for includes — use GetInclude for include source. Include names (PROG/I) and other object types are rejected with error "invalid_object_type". Answers: "show program code", "display report source", "view program X", "get program source". Returns source code, package, responsible, description.',
    inputSchema: {
        type: 'object',
        properties: {
            program_name: {
                type: 'string',
                description: 'Program name (e.g., Z_MY_PROGRAM).',
            },
            version: {
                type: 'string',
                enum: ['active', 'inactive'],
                description: 'Version to read: "active" (default) or "inactive".',
                default: 'active',
            },
        },
        required: ['program_name'],
    },
};
async function handleReadProgram(context, args) {
    const { connection, logger } = context;
    try {
        const { program_name, version = 'active' } = args;
        if (!program_name)
            return (0, utils_1.return_error)(new Error('program_name is required'));
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const programName = program_name.toUpperCase();
        const obj = client.getProgram();
        let source_code = null;
        try {
            const readResult = await obj.read({ programName }, version);
            if (readResult?.readResult?.data) {
                source_code =
                    typeof readResult.readResult.data === 'string'
                        ? readResult.readResult.data
                        : safeStringify(readResult.readResult.data);
            }
        }
        catch (e) {
            logger?.warn(`Could not read source for ${programName}: ${e?.message}`);
        }
        let metadata = null;
        try {
            const metaResult = await obj.readMetadata({ programName });
            if (metaResult?.metadataResult?.data) {
                metadata =
                    typeof metaResult.metadataResult.data === 'string'
                        ? metaResult.metadataResult.data
                        : safeStringify(metaResult.metadataResult.data);
            }
        }
        catch (e) {
            logger?.warn(`Could not read metadata for ${programName}: ${e?.message}`);
        }
        // ReadProgram only reads main programs (PROG/P). Detect the actual object
        // type from the metadata and reject anything else (e.g. includes PROG/I) so
        // the caller gets a structured "invalid_object_type" error instead of a
        // misleading { success: true, source_code: null } that reads as a
        // permission/inactive-object problem rather than "wrong object type".
        // No redirect/suggestion is emitted — choosing the right tool is the
        // consumer's decision; we only report what the object is.
        const objectType = metadata
            ? (/adtcore:type="([^"]+)"/.exec(metadata)?.[1] ?? null)
            : null;
        const isMainProgram = objectType === 'PROG/P';
        // When metadata is missing entirely we cannot read it as a main program
        // either (the programs endpoint returned nothing usable for both source
        // and metadata) — treat that as the same error.
        if (!isMainProgram || (source_code === null && metadata === null)) {
            return (0, utils_1.return_response)({
                data: JSON.stringify({
                    success: false,
                    error: 'invalid_object_type',
                    program_name: programName,
                    object_type: objectType,
                    message: objectType
                        ? `"${programName}" has object type ${objectType}, not a main program (PROG/P). ReadProgram reads only main programs (PROG/P).`
                        : `No main-program (PROG/P) source or metadata found for "${programName}". ReadProgram reads only main programs (PROG/P).`,
                }, null, 2),
            });
        }
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                program_name: programName,
                version,
                source_code,
                metadata,
            }, null, 2),
        });
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
}
function safeStringify(data) {
    try {
        return JSON.stringify(data);
    }
    catch {
        return String(data);
    }
}
//# sourceMappingURL=handleReadProgram.js.map