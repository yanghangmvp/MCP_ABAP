"use strict";
/**
 * CreateMetadataExtension Handler - ABAP Metadata Extension Creation via ADT API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleCreateMetadataExtension = handleCreateMetadataExtension;
const adtMessages_1 = require("../../../lib/adtMessages");
const adtObjectOps_1 = require("../../../lib/adtObjectOps");
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const transportValidation_js_1 = require("../../../utils/transportValidation.js");
exports.TOOL_DEFINITION = {
    name: 'CreateMetadataExtension',
    available_in: ['onprem', 'cloud'],
    description: 'Operation: Create. Subject: MetadataExtension. Will be useful for creating metadata extension. Create a new ABAP Metadata Extension (DDLX) in SAP system. Creates the metadata extension object in initial state.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Metadata Extension name',
            },
            description: {
                type: 'string',
                description: 'Description',
            },
            package_name: {
                type: 'string',
                description: 'Package name',
            },
            transport_request: {
                type: 'string',
                description: 'Transport request number',
            },
            activate: {
                type: 'boolean',
                description: 'Activate after creation. DEFAULT FALSE, and passing true will normally FAIL. ' +
                    'This tool creates an EMPTY metadata extension: it writes no source, so the new ' +
                    'object has no `annotate` statement and SAP rejects its activation with ' +
                    'Illegal syntax. Malformed annotate statement. Write the source with ' +
                    'UpdateMetadataExtension (which activates by default) as the second step.',
            },
        },
        required: ['name', 'package_name'],
    },
};
async function handleCreateMetadataExtension(context, params) {
    const { connection, logger } = context;
    const args = params;
    if (!args.name || !args.package_name) {
        return (0, utils_1.return_error)(new Error('Missing required parameters'));
    }
    try {
        (0, transportValidation_js_1.validateTransportRequest)(args.package_name, args.transport_request);
    }
    catch (error) {
        return (0, utils_1.return_error)(error);
    }
    const name = args.name.toUpperCase();
    logger?.info(`Starting DDLX creation: ${name}`);
    try {
        const client = (0, clients_1.createAdtClient)(connection, logger);
        // DEFAULT FALSE, changed in the field report round-3 pass. The default used to be
        // true and the activation could NEVER succeed: this handler creates a bare
        // DDLX shell and writes no source, so there is no `annotate` statement to
        // activate and SAP answers "Illegal syntax. Malformed 'annotate'
        // statement.". The result literal reported success unconditionally, so the
        // failure was invisible — including in this repo's own integration test,
        // which passed for as long as the handler lied. Same shell-then-fill
        // contract as CreateTable and CreateView.
        const shouldActivate = args.activate === true;
        // Fail fast if the name is already taken (stateless-pinned validation).
        await (0, utils_1.assertObjectDoesNotExist)(`Metadata extension ${name}`, () => client.getMetadataExtension().validate({
            name,
            packageName: args.package_name,
            description: args.description || name,
        }), connection);
        // Create
        await client.getMetadataExtension().create({
            name,
            description: args.description || name,
            packageName: args.package_name,
            transportRequest: args.transport_request || '',
        });
        // Lock
        let activation;
        const lockHandle = await client.getMetadataExtension().lock({ name: name });
        try {
            // Check
            await client.getMetadataExtension().check({ name: name });
            // Unlock
            await client.getMetadataExtension().unlock({ name: name }, lockHandle);
            // Wait for object to be ready after update (long polling)
            try {
                await client
                    .getMetadataExtension()
                    .read({ name }, 'inactive', { withLongPolling: true });
            }
            catch {
                // Continue anyway — activation will fail explicitly if object isn't ready
            }
            // Activate if requested — and report SAP's verdict, not the request flag.
            if (shouldActivate) {
                activation = await (0, adtObjectOps_1.activateWrittenObject)(connection, name, 'DDLX', `Metadata Extension ${name}`, 'created');
            }
        }
        catch (error) {
            // Unlock on error (principle 1: if lock was done, unlock is mandatory)
            try {
                await client.getMetadataExtension().unlock({ name: name }, lockHandle);
            }
            catch (unlockError) {
                logger?.error(`Failed to unlock metadata extension after error: ${unlockError instanceof Error ? unlockError.message : String(unlockError)}`);
            }
            // Principle 2: first error and exit
            throw error;
        }
        const result = {
            success: true,
            name: name,
            package_name: args.package_name,
            type: 'DDLX',
            ...(0, adtObjectOps_1.writtenActivationFields)(activation),
            message: activation
                ? (0, adtMessages_1.describeActivation)(activation, `Metadata Extension ${name}`)
                : `Metadata Extension ${name} created successfully as an EMPTY shell ` +
                    '(no source, not activated). Write its `annotate` source with ' +
                    'UpdateMetadataExtension to make it usable.',
        };
        return (0, utils_1.return_response)({
            data: JSON.stringify(result, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`Error creating DDLX ${name}: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleCreateMetadataExtension.js.map