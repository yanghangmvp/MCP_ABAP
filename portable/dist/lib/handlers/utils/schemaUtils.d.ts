/**
 * Converts JSON Schema to Zod schema object (not z.object(), but object with Zod fields)
 * SDK expects inputSchema to be an object with Zod schemas as values, not z.object()
 */
export declare function jsonSchemaToZod(jsonSchema: any): any;
//# sourceMappingURL=schemaUtils.d.ts.map