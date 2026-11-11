/**
 * PublishServiceBinding / UnpublishServiceBinding Handlers
 *
 * Publish (or unpublish) the OData service of an activated service binding —
 * the step AFTER ActivateServiceBinding that actually makes the service
 * consumable (local service endpoint / IWFND registration).
 *
 * Endpoints (aligned with abap-adt-api):
 *   OData V2: POST /sap/bc/adt/businessservices/odatav2/{publishjobs|unpublishjobs}
 *             ?servicename={name}&serviceversion={version}
 *             body: <adtcore:objectReference adtcore:name="{name}"/>
 *   OData V4: POST /sap/bc/adt/businessservices/odatav4/{publishjobs|unpublishjobs}
 *             body: <adtcore:objectReference adtcore:type="SCGR" adtcore:name="{name}"/>
 *
 * Both respond with an ABAP StatusMessage (SEVERITY / SHORT_TEXT / LONG_TEXT).
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export interface PublishArgs {
    binding_name: string;
    odata_version?: 'v2' | 'v4';
    service_name?: string;
    service_version?: string;
}
export declare function publishUnpublish(context: HandlerContext, args: PublishArgs, action: 'publish' | 'unpublish'): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
export declare const TOOL_DEFINITION: {
    readonly name: "PublishServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Publish the OData service of an activated service binding so it becomes consumable (local service endpoint / gateway registration). Run AFTER ActivateServiceBinding. For OData V2 bindings (e.g. UI_V2) use odata_version \"v2\" (default) with optional service_name/service_version; for V4 bindings use \"v4\". Returns the SAP status message (severity + texts).";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly binding_name: {
                readonly type: "string";
                readonly description: "Service binding name (e.g. YUI_MFGR001_001).";
            };
            readonly odata_version: {
                readonly type: "string";
                readonly enum: readonly ["v2", "v4"];
                readonly description: "OData version of the binding. Default: v2.";
            };
            readonly service_name: {
                readonly type: "string";
                readonly description: "V2 only: published service name if it differs from the binding name. Default: binding_name.";
            };
            readonly service_version: {
                readonly type: "string";
                readonly description: "V2 only: service version. Default: 0001.";
            };
        };
        readonly required: readonly ["binding_name"];
    };
};
export declare function handlePublishServiceBinding(context: HandlerContext, args: PublishArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handlePublishServiceBinding.d.ts.map