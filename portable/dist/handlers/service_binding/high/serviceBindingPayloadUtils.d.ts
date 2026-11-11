export type ServiceBindingResponseFormat = 'xml' | 'json' | 'plain';
export declare function resolveServiceBindingAcceptHeader(format: ServiceBindingResponseFormat): string;
export declare function parseServiceBindingPayload(payload: unknown, format: ServiceBindingResponseFormat): unknown;
//# sourceMappingURL=serviceBindingPayloadUtils.d.ts.map