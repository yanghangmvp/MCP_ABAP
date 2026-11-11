import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type ServiceBindingResponseFormat } from './serviceBindingPayloadUtils';
export declare const TOOL_DEFINITION: {
    readonly name: "GetServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Retrieve ABAP service binding source/metadata by name via ADT Business Services endpoint, plus the RESOLVED service root URL (service_root) for a published binding — the path to call for $metadata or an entity set, taken from SAP rather than guessed.";
    readonly notes: "service_root is NOT derived. The binding document itself does not carry a URL, so the\nhandler follows the binding's own OData category link — GET /sap/bc/adt/businessservices/odatav4/{name}\n?servicename={name} (Accept application/vnd.sap.adt.businessservices.odatav4.v1+xml), or the odatav2\nequivalent with .odatav2.v2+xml — and reports what SAP answers there.\n\nThat answer carries odatav4:serviceUrl (the complete root), odatav4:serviceUrlPrefix,\nodatav4:repositoryId and the entity collections with their isRoot flag. repositoryId is the segment\nthat cannot be guessed: a UI binding resolves to SRVD and an A2X/Web-API binding to SRVD_A2X, so a\ncaller copying the shape of somebody else's URL gets\n\n    403 Service '<SRVD>' repository 'SRVD_A2X' is not assigned to group '<binding>'\n\nMeasured on S/4HANA 2023 FPS02: an ODATA_V4_WEB_API binding answers repositoryId SRVD_A2X and\nserviceUrl /sap/opu/odata4/sap/<binding>/srvd_a2x/sap/<service>/0001/. The V2 endpoint answers 200\nwith empty values for a V4 binding, so the version is taken from the binding's own srvb:binding.\n\nAn unpublished binding has no root: service_root is null and service_root_note says why. A failure\nto resolve it never fails the read — the binding document is still returned, with the reason in\nservice_root_note.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly service_binding_name: {
                readonly type: "string";
                readonly description: "Service binding name (for example: ZUI_MY_BINDING). Case-insensitive.";
            };
            readonly response_format: {
                readonly type: "string";
                readonly enum: readonly ["xml", "json", "plain"];
                readonly description: "Preferred response format. \"json\" requests JSON from endpoint, \"xml\" parses XML payload, \"plain\" returns raw text.";
                readonly default: "xml";
            };
        };
        readonly required: readonly ["service_binding_name"];
    };
};
interface GetServiceBindingArgs {
    service_binding_name: string;
    response_format?: ServiceBindingResponseFormat;
}
export declare function handleGetServiceBinding(context: HandlerContext, args: GetServiceBindingArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetServiceBinding.d.ts.map