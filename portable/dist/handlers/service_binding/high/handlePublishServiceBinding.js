"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.publishUnpublish = publishUnpublish;
exports.handlePublishServiceBinding = handlePublishServiceBinding;
const utils_1 = require("../../../lib/utils");
function statusFromBody(body) {
    const sev = body
        .match(/<SEVERITY>([\s\S]*?)<\/SEVERITY>/i)?.[1]
        ?.trim()
        .toLowerCase() || 'ok';
    const short = body.match(/<SHORT_TEXT>([\s\S]*?)<\/SHORT_TEXT>/i)?.[1]?.trim() || '';
    const long = body.match(/<LONG_TEXT>([\s\S]*?)<\/LONG_TEXT>/i)?.[1]?.trim() || '';
    return { severity: sev, short_text: short, long_text: long || null };
}
async function publishUnpublish(context, args, action) {
    const { connection, logger } = context;
    try {
        const { binding_name, odata_version = 'v2', service_name, service_version = '0001', } = args ?? {};
        if (!binding_name) {
            return (0, utils_1.return_error)(new Error('binding_name is required'));
        }
        const name = binding_name.toUpperCase();
        const jobs = action === 'publish' ? 'publishjobs' : 'unpublishjobs';
        let url;
        let params;
        let body;
        if (odata_version === 'v4') {
            url = `/sap/bc/adt/businessservices/odatav4/${jobs}`;
            params = undefined;
            body =
                `<?xml version="1.0" encoding="UTF-8"?>` +
                    `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
                    `<adtcore:objectReference adtcore:type="SCGR" adtcore:name="${name}"/>` +
                    `</adtcore:objectReferences>`;
        }
        else {
            const svc = (service_name ?? binding_name).toUpperCase();
            url = `/sap/bc/adt/businessservices/odatav2/${jobs}`;
            params = { servicename: svc, serviceversion: service_version };
            body =
                `<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">` +
                    `<adtcore:objectReference adtcore:name="${svc}"/>` +
                    `</adtcore:objectReferences>`;
        }
        logger?.info(`${action === 'publish' ? 'Publish' : 'Unpublish'}ServiceBinding: ${name} (OData ${odata_version.toUpperCase()})`);
        let responseBody = '';
        let httpStatus = 0;
        try {
            const resp = await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'POST', 'long', body, params, {
                'Content-Type': 'application/xml',
                Accept: 'application/xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage, application/*',
            });
            responseBody = String(resp.data ?? '');
            httpStatus = resp.status ?? 200;
        }
        catch (error) {
            // The job endpoints put the StatusMessage in error responses too
            const errBody = String(error?.response?.data ?? '');
            if (errBody && /<SHORT_TEXT>/i.test(errBody)) {
                responseBody = errBody;
                httpStatus = error?.response?.status ?? 0;
            }
            else {
                throw error;
            }
        }
        const status = statusFromBody(responseBody);
        const success = status.severity === 'ok' ||
            status.severity === 'success' ||
            status.severity === 'info' ||
            status.severity === 'warning';
        logger?.info(`${action}ServiceBinding ${name}: severity=${status.severity} ${status.short_text}`);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success,
                action,
                binding_name: name,
                odata_version,
                ...(odata_version === 'v2'
                    ? {
                        service_name: (service_name ?? binding_name).toUpperCase(),
                        service_version,
                    }
                    : {}),
                http_status: httpStatus,
                severity: status.severity,
                short_text: status.short_text,
                long_text: status.long_text,
                message: status.short_text
                    ? `${action} ${name}: [${status.severity}] ${status.short_text}`
                    : `${action} ${name}: completed (severity ${status.severity})`,
            }, null, 2),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        });
    }
    catch (error) {
        logger?.error(`${action}ServiceBinding failed: ${error?.message || error}`);
        return (0, utils_1.return_error)(error);
    }
}
exports.TOOL_DEFINITION = {
    name: 'PublishServiceBinding',
    available_in: ['onprem', 'cloud'],
    description: 'Publish the OData service of an activated service binding so it becomes consumable (local service endpoint / gateway registration). Run AFTER ActivateServiceBinding. For OData V2 bindings (e.g. UI_V2) use odata_version "v2" (default) with optional service_name/service_version; for V4 bindings use "v4". Returns the SAP status message (severity + texts).',
    inputSchema: {
        type: 'object',
        properties: {
            binding_name: {
                type: 'string',
                description: 'Service binding name (e.g. YUI_MFGR001_001).',
            },
            odata_version: {
                type: 'string',
                enum: ['v2', 'v4'],
                description: 'OData version of the binding. Default: v2.',
            },
            service_name: {
                type: 'string',
                description: 'V2 only: published service name if it differs from the binding name. Default: binding_name.',
            },
            service_version: {
                type: 'string',
                description: 'V2 only: service version. Default: 0001.',
            },
        },
        required: ['binding_name'],
    },
};
async function handlePublishServiceBinding(context, args) {
    return publishUnpublish(context, args, 'publish');
}
//# sourceMappingURL=handlePublishServiceBinding.js.map