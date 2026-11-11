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
exports.TOOL_DEFINITION = void 0;
exports.handleGetPackageContents = handleGetPackageContents;
const z = __importStar(require("zod"));
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetPackageContents',
    available_in: ['onprem', 'cloud', 'legacy'],
    description: '[read-only] Retrieve objects inside an ABAP package as a flat list. Supports recursive traversal of subpackages. A package that does not exist is an ERROR, never an empty list — so [] means the package is real and empty.',
    notes: `False zero, closed. /repository/nodestructure answers with the SAME empty node set for a
package that exists and is empty and for a package name that does not exist at all — measured: a
guessed name and a deliberate ZZZ_NO_SUCH_PACKAGE_99 both returned [], while the real package
returned 39 objects. A caller therefore could not tell "empty" from "not there", and concluding
"empty" is the wrong answer that looks right.

So when the contents come back empty the package's existence is confirmed independently:
GET /sap/bc/adt/packages/{name} is an exact oracle (measured 200 for an EMPTY package, 200 for a
populated one, 404 for a name that is not there). Missing -> an error naming the package. Present ->
[] , which now provably means empty. If the oracle itself cannot answer, that is also an error: a
zero this tool cannot stand behind is the defect, not the answer.

The check costs one extra request and only runs on an empty result, so a populated package pays
nothing for it.`,
    inputSchema: {
        package_name: z
            .string()
            .describe('Name of the ABAP package (e.g., "ZMY_PACKAGE")'),
        include_subpackages: z
            .boolean()
            .optional()
            .describe('Include contents of subpackages recursively (default: false)'),
        max_depth: z
            .number()
            .optional()
            .describe('Maximum depth for recursive package traversal (default: 5)'),
        include_descriptions: z
            .boolean()
            .optional()
            .describe('Include object descriptions in response (default: true)'),
    },
};
/**
 * Does the package exist? `undefined` for "could not determine" — never guessed.
 *
 * `GET /sap/bc/adt/packages/{name}` is an exact oracle on this endpoint family:
 * measured 200 for an EMPTY package, 200 for a populated one, 404 for a name
 * that is not there. (Same oracle GetObjectInfo uses for the identical reason.)
 */
async function packageExists(context, packageName) {
    try {
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(context.connection, `/sap/bc/adt/packages/${encodeURIComponent(packageName.toLowerCase())}`, 'GET', 'default', undefined, undefined, { Accept: 'application/vnd.sap.adt.packages.v1+xml, application/xml' });
        return response?.status === 200;
    }
    catch (error) {
        if (error?.response?.status === 404)
            return false;
        return undefined;
    }
}
async function handleGetPackageContents(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.package_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Package name is required');
        }
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const utils = client.getUtils();
        // The /repository/nodestructure endpoint bleeds a node's DESCRIPTION from a
        // previously-fetched node when a STATEFUL server-side session is alive
        // (verified live: DTEL/TABL then show the DOMA sibling's text, worsening
        // across calls). Create/lock handlers leave such a session open on the
        // shared cached connection. `setSessionType('stateless')` only OMITS the
        // session header — it does NOT terminate the lingering session; an EXPLICIT
        // `x-sap-adt-sessiontype: stateless` header does (verified live). Force it
        // for the node fetch, then restore the connection's request function.
        const restore = (0, utils_1.withExplicitStatelessHeader)(connection);
        let items;
        try {
            // Use the optimized list method from adt-clients 0.3.13
            items = await utils.getPackageContentsList(args.package_name.toUpperCase(), {
                includeSubpackages: args.include_subpackages,
                maxDepth: args.max_depth,
                includeDescriptions: args.include_descriptions,
            });
        }
        finally {
            restore();
        }
        // A ZERO is only reported when it can be defended — see the notes above.
        if (Array.isArray(items) && items.length === 0) {
            const exists = await packageExists(context, args.package_name);
            if (exists === false) {
                throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, `Package ${args.package_name.toUpperCase()} does not exist. ` +
                    '(An empty result from the repository tree does not distinguish "empty" ' +
                    'from "not there", so existence was verified separately.)');
            }
            if (exists === undefined) {
                throw new utils_1.McpError(utils_1.ErrorCode.InternalError, `Package ${args.package_name.toUpperCase()} returned no objects and its existence ` +
                    'could not be verified, so this is reported as a failure rather than as an empty ' +
                    'package. Retry, or read the package directly with GetPackage.');
            }
        }
        const finalResult = {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(items, null, 2),
                },
            ],
        };
        return finalResult;
    }
    catch (error) {
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: error instanceof Error ? error.message : String(error),
                },
            ],
        };
    }
}
//# sourceMappingURL=handleGetPackageContents.js.map