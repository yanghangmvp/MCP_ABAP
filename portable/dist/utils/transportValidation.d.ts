/**
 * Validates transport request requirement based on package name.
 * If transport_request is not provided, we assume it's a local object and let SAP handle the validation.
 * No strict validation - if creation fails, SAP will return an error.
 *
 * @param packageName - The package name to validate
 * @param transportRequest - The transport request (optional)
 * @param superPackage - The super package name (optional, not used for validation)
 */
export declare function validateTransportRequest(_packageName: string, _transportRequest: string | undefined, _superPackage?: string): void;
//# sourceMappingURL=transportValidation.d.ts.map