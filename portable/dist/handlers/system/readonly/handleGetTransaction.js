"use strict";
/**
 * GetTransaction — resolve an ABAP transaction code to what it actually starts.
 *
 * Previously this handler returned `{"message":"Not implemented"}`: the original
 * body was commented out because it called a `client.readTransaction()` that
 * does not exist, and there is no ADT resource that returns transaction
 * properties directly.
 *
 * The information does live in the Dictionary, so it is read the way SE93 reads
 * it — via the ADT Data Preview (freestyle SQL), the same channel GetSqlQuery
 * uses:
 *   - TSTC  — TCODE, PGMNA (program), DYPNO (screen), CINFO (type flags)
 *   - TSTCT — TTEXT (short text, language-dependent)
 * TSTCT is queried separately rather than joined so that a transaction with no
 * text in the session language still resolves.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.handleGetTransaction = handleGetTransaction;
const clients_1 = require("../../../lib/clients");
const utils_1 = require("../../../lib/utils");
const handleGetSqlQuery_1 = require("./handleGetSqlQuery");
exports.TOOL_DEFINITION = {
    name: 'GetTransaction',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Retrieve ABAP transaction (t-code) details: the program it starts (TSTC-PGMNA), the screen number (TSTC-DYPNO) and its short text (TSTCT-TTEXT). Reads the Dictionary through the ADT Data Preview, because ADT exposes no transaction resource of its own. Returns exists:false for an unknown t-code rather than failing.',
    inputSchema: {
        type: 'object',
        properties: {
            transaction_name: {
                type: 'string',
                description: 'Transaction code (e.g., SE11, VA01). Case-insensitive.',
            },
        },
        required: ['transaction_name'],
    },
};
/** Read a column from a Data Preview row regardless of key casing. */
function pick(row, column) {
    if (!row)
        return '';
    const direct = row[column] ?? row[column.toLowerCase()];
    if (direct != null)
        return String(direct);
    const hit = Object.keys(row).find((k) => k.toUpperCase() === column.toUpperCase());
    return hit ? String(row[hit] ?? '') : '';
}
/** Escape a value for embedding in an ABAP SQL string literal. */
function sqlLiteral(value) {
    return value.replace(/'/g, "''");
}
/**
 * Run one freestyle SQL statement through the Data Preview and return its rows
 * as plain objects, reusing the proven parser from GetSqlQuery rather than
 * re-deriving the dataPreview XML shape. Never throws for "no rows"; a
 * transport failure propagates.
 */
async function selectRows(client, sql, rowNumber, logger) {
    const response = await client
        .getUtils()
        .getSqlQuery({ sql_query: sql, row_number: rowNumber });
    if (response?.status !== 200 || !response?.data)
        return [];
    const data = typeof response.data === 'string' ? response.data : String(response.data);
    return (0, handleGetSqlQuery_1.parseSqlQueryXml)(data, sql, rowNumber, logger).rows;
}
async function handleGetTransaction(context, args) {
    const { connection, logger } = context;
    try {
        if (!args?.transaction_name) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'transaction_name is required');
        }
        const tcode = args.transaction_name.trim().toUpperCase();
        logger?.info(`Resolving transaction ${tcode}`);
        const client = (0, clients_1.createAdtClient)(connection, logger);
        const literal = sqlLiteral(tcode);
        const tstc = await selectRows(client, `SELECT tcode, pgmna, dypno, cinfo FROM tstc WHERE tcode = '${literal}'`, 1, logger);
        if (tstc.length === 0) {
            return {
                isError: false,
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            exists: false,
                            transaction_name: tcode,
                            message: `Transaction ${tcode} does not exist in TSTC.`,
                        }, null, 2),
                    },
                ],
            };
        }
        const row = tstc[0];
        // The text table is optional — a missing short text must not fail the call.
        //
        // TSTCT is LANGUAGE-DEPENDENT (SE11 has 6 rows on the test system), but the
        // language cannot be filtered here: the ADT Data Preview REJECTS the SPRAS
        // column outright — `SELECT spras ...`, `WHERE spras = 'E'` and `spras =
        // 'EN'` all answer HTTP 400 on SAP_BASIS 7.56, while the same query without
        // SPRAS works and `AND` on other columns is fine. So the first row is taken
        // and the response says plainly that its language is unspecified, rather
        // than implying the text is in the session language.
        let text = '';
        try {
            const tstct = await selectRows(client, `SELECT ttext FROM tstct WHERE tcode = '${literal}'`, 1, logger);
            text = pick(tstct[0], 'TTEXT');
        }
        catch (textError) {
            logger?.debug?.(`TSTCT lookup failed for ${tcode}: ${textError?.message || textError}`);
        }
        const program = pick(row, 'PGMNA');
        const screen = pick(row, 'DYPNO');
        return {
            isError: false,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        exists: true,
                        transaction_name: pick(row, 'TCODE') || tcode,
                        program: program || null,
                        screen: screen || null,
                        description: text || null,
                        description_language: 'unspecified — TSTCT is language-dependent and the ADT Data Preview rejects the SPRAS column, so the language of this text cannot be constrained',
                        // CINFO is a bit-flag byte describing the transaction kind; it is
                        // relayed raw rather than decoded, since the decoding differs by
                        // release and a wrong label is worse than none.
                        cinfo: pick(row, 'CINFO') || null,
                        source: 'TSTC/TSTCT via ADT Data Preview',
                        hint: program
                            ? `Read the program with GetProgram { program_name: "${program}" }.`
                            : 'No program in TSTC — this is likely an OO or parameter transaction.',
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        logger?.error(`Failed to resolve transaction ${args?.transaction_name}`, error);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `ADT error: ${String(error)}`,
                },
            ],
        };
    }
}
//# sourceMappingURL=handleGetTransaction.js.map