"use strict";
/**
 * GetTransport Handler - Retrieve ABAP transport request information via ADT API
 *
 * Retrieves transport request details including:
 * - Transport metadata (number, description, type, status)
 * - Owner and target system information
 * - Included objects and tasks
 * - Change history
 *
 * @TODO Migrate to infrastructure module or enhance AdtClient.getRequest().read()
 * Current AdtClient.getRequest().read() doesn't support:
 * - includeObjects and includeTasks query parameters
 * - XML parsing (returns raw AxiosResponse)
 * This handler provides richer functionality that should be added to adt-clients
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITION = void 0;
exports.parseTransportXml = parseTransportXml;
exports.handleGetTransport = handleGetTransport;
const fast_xml_parser_1 = require("fast-xml-parser");
const utils_1 = require("../../../lib/utils");
exports.TOOL_DEFINITION = {
    name: 'GetTransport',
    available_in: ['onprem', 'cloud'],
    description: '[read-only] Retrieve ABAP transport request information including metadata, included objects, and status from SAP system. include_objects: false strips objects from the task entries too.',
    notes: `Response size. A request's objects appear in TWO places: flat under the request, and nested
inside each of its tasks. include_objects: false removes both (a caller who asked for "no objects"
used to still get every object nested under the tasks — 68 KB / 2467 lines for a request whose
object-free answer is ~20 lines). To see only the request header, pass include_objects: false AND
include_tasks: false.

object_count / task_count always report what was PARSED, so they read 0 when the corresponding flag
is false. Use them to judge the response you asked for, not the size of the request.`,
    inputSchema: {
        type: 'object',
        properties: {
            transport_number: {
                type: 'string',
                description: 'Transport request number (e.g., ABCK900001, ABCK900002)',
            },
            include_objects: {
                type: 'boolean',
                description: 'Include list of objects in transport (default: true)',
                default: true,
            },
            include_tasks: {
                type: 'boolean',
                description: 'Include list of tasks in transport (default: true)',
                default: true,
            },
        },
        required: ['transport_number'],
    },
};
/**
 * Parse transport request XML response
 */
function parseTransportXml(xmlData, includeObjects = true, includeTasks = true) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '_text',
        parseAttributeValue: true,
        isArray: (name, _jpath, _isLeafNode, _isAttribute) => {
            // Arrays for multiple objects/tasks
            return ['tm:object', 'tm:task', 'object', 'task'].includes(name);
        },
    });
    const result = parser.parse(xmlData);
    const root = result['tm:root'] || result.root;
    if (!root) {
        throw new utils_1.McpError(utils_1.ErrorCode.InternalError, 'Invalid transport XML structure - no tm:root found');
    }
    // Get detailed transport info from tm:request inside tm:root
    const request = root['tm:request'] || {};
    // Extract basic transport information from both root attributes and request details
    const transportInfo = {
        number: root['adtcore:name'] || request['tm:number'] || root.name,
        description: request['tm:desc'] || request.description || root['tm:description'],
        type: request['tm:type'] || root['tm:object_type'] || root.type,
        status: request['tm:status'] || root['tm:status'],
        status_text: request['tm:status_text'],
        owner: request['tm:owner'] || root['tm:owner'],
        target_system: request['tm:target'] || root['tm:target'],
        target_desc: request['tm:target_desc'],
        created_at: root['adtcore:createdAt'] || request['tm:createdAt'] || root.createdAt,
        created_by: root['adtcore:createdBy'] || request['tm:createdBy'] || root.createdBy,
        changed_at: root['adtcore:changedAt'] || request['tm:changedAt'] || root.changedAt,
        changed_by: root['adtcore:changedBy'] || request['tm:changedBy'] || root.changedBy,
        release_date: request['tm:releaseDate'] || root.releaseDate,
        client: request['tm:source_client'] || root['tm:client'],
        cts_project: request['tm:cts_project'],
        cts_project_desc: request['tm:cts_project_desc'],
    };
    // Extract objects if requested
    let objects = [];
    if (includeObjects && request['tm:all_objects']) {
        const objectList = request['tm:all_objects']['tm:abap_object'] || [];
        objects = Array.isArray(objectList) ? objectList : [objectList];
        objects = objects.map((obj) => ({
            name: obj['tm:name'],
            type: obj['tm:type'],
            wbtype: obj['tm:wbtype'],
            pgmid: obj['tm:pgmid'],
            description: obj['tm:obj_desc'],
            position: obj['tm:position'],
            lock_status: obj['tm:lock_status'],
            info: obj['tm:obj_info'],
        }));
    }
    // Extract tasks if requested
    let tasks = [];
    if (includeTasks && request['tm:task']) {
        const taskList = Array.isArray(request['tm:task'])
            ? request['tm:task']
            : [request['tm:task']];
        tasks = taskList.map((task) => ({
            number: task['tm:number'],
            parent: task['tm:parent'],
            description: task['tm:desc'],
            type: task['tm:type'],
            status: task['tm:status'],
            status_text: task['tm:status_text'],
            owner: task['tm:owner'],
            target: task['tm:target'],
            target_desc: task['tm:target_desc'],
            client: task['tm:source_client'],
            created_at: task['tm:lastchanged_timestamp'],
            // `include_objects: false` has to strip the objects HERE too. A request's
            // objects arrive twice: once flat under tm:all_objects, and once nested
            // inside each tm:task — and include_tasks defaults to TRUE. Reading the
            // flag only at the top level meant a caller who asked for "no objects"
            // still received every object in the request: measured 68 KB / 2467 lines
            // for a request whose object-free answer is ~20 lines, which blew a
            // caller's token cap.
            objects: includeObjects && task['tm:abap_object']
                ? (Array.isArray(task['tm:abap_object'])
                    ? task['tm:abap_object']
                    : [task['tm:abap_object']]).map((obj) => ({
                    name: obj['tm:name'],
                    type: obj['tm:type'],
                    wbtype: obj['tm:wbtype'],
                    description: obj['tm:obj_desc'],
                    position: obj['tm:position'],
                }))
                : [],
        }));
    }
    return {
        transport: transportInfo,
        objects: includeObjects ? objects : undefined,
        tasks: includeTasks ? tasks : undefined,
        object_count: objects.length,
        task_count: tasks.length,
    };
}
/**
 * Main handler for GetTransport MCP tool
 */
async function handleGetTransport(context, args) {
    const { connection, logger } = context;
    try {
        // Validate required parameters
        if (!args?.transport_number) {
            throw new utils_1.McpError(utils_1.ErrorCode.InvalidParams, 'Transport number is required');
        }
        const typedArgs = args;
        const includeObjects = typedArgs.include_objects !== false;
        const includeTasks = typedArgs.include_tasks !== false;
        logger?.debug(`GetTransport: ${typedArgs.transport_number}`);
        logger?.debug(`Include objects: ${includeObjects}, Include tasks: ${includeTasks}`);
        let url = `/sap/bc/adt/cts/transportrequests/${typedArgs.transport_number}`;
        // Add query parameters for additional information
        const params = [];
        if (includeObjects)
            params.push('includeObjects=true');
        if (includeTasks)
            params.push('includeTasks=true');
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        const headers = {
            Accept: 'application/vnd.sap.adt.transportorganizer.v1+xml',
        };
        logger?.debug(`GET from: ${url}`);
        // Get transport request
        const response = await (0, utils_1.makeAdtRequestWithTimeout)(connection, url, 'GET', 'default', undefined, undefined, headers);
        logger?.debug(`GetTransport response status: ${response.status}`);
        // Parse XML response
        const transportData = parseTransportXml(response.data, includeObjects, includeTasks);
        return (0, utils_1.return_response)({
            data: JSON.stringify({
                success: true,
                transport_number: typedArgs.transport_number,
                ...transportData,
                message: `Transport ${typedArgs.transport_number} retrieved successfully`,
            }, null, 2),
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config,
        });
    }
    catch (error) {
        if (error instanceof utils_1.McpError) {
            throw error;
        }
        return (0, utils_1.return_error)(error);
    }
}
//# sourceMappingURL=handleGetTransport.js.map