/**
 * UnpublishServiceBinding Handler
 *
 * Unpublish the OData service of a service binding (remove the local service
 * endpoint / gateway registration). Counterpart of PublishServiceBinding.
 *
 * Shares the publish/unpublish core (publishUnpublish) with
 * handlePublishServiceBinding; kept in its own file so each tool follows the
 * repo convention of one TOOL_DEFINITION per handler file.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { type PublishArgs } from './handlePublishServiceBinding';
export declare const TOOL_DEFINITION: {
    readonly name: "UnpublishServiceBinding";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "Unpublish the OData service of a service binding (remove the local service endpoint / gateway registration). Counterpart of PublishServiceBinding; same parameters.";
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
export declare function handleUnpublishServiceBinding(context: HandlerContext, args: PublishArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: any;
    }[];
}>;
//# sourceMappingURL=handleUnpublishServiceBinding.d.ts.map