"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompactHandlersGroup = void 0;
const handleHandlerActivate_1 = require("../../../handlers/compact/high/handleHandlerActivate");
const handleHandlerAtc_1 = require("../../../handlers/compact/high/handleHandlerAtc");
const handleHandlerCdsUnitTestResult_1 = require("../../../handlers/compact/high/handleHandlerCdsUnitTestResult");
const handleHandlerCdsUnitTestStatus_1 = require("../../../handlers/compact/high/handleHandlerCdsUnitTestStatus");
const handleHandlerCheckRun_1 = require("../../../handlers/compact/high/handleHandlerCheckRun");
const handleHandlerCreate_1 = require("../../../handlers/compact/high/handleHandlerCreate");
const handleHandlerDelete_1 = require("../../../handlers/compact/high/handleHandlerDelete");
const handleHandlerDumpList_1 = require("../../../handlers/compact/high/handleHandlerDumpList");
const handleHandlerDumpView_1 = require("../../../handlers/compact/high/handleHandlerDumpView");
const handleHandlerGet_1 = require("../../../handlers/compact/high/handleHandlerGet");
const handleHandlerInactiveObjects_1 = require("../../../handlers/compact/high/handleHandlerInactiveObjects");
const handleHandlerLock_1 = require("../../../handlers/compact/high/handleHandlerLock");
const handleHandlerProfileList_1 = require("../../../handlers/compact/high/handleHandlerProfileList");
const handleHandlerProfileRun_1 = require("../../../handlers/compact/high/handleHandlerProfileRun");
const handleHandlerProfileView_1 = require("../../../handlers/compact/high/handleHandlerProfileView");
const handleHandlerQuery_1 = require("../../../handlers/compact/high/handleHandlerQuery");
const handleHandlerRuntime_1 = require("../../../handlers/compact/high/handleHandlerRuntime");
const handleHandlerSearch_1 = require("../../../handlers/compact/high/handleHandlerSearch");
const handleHandlerServiceBindingListTypes_1 = require("../../../handlers/compact/high/handleHandlerServiceBindingListTypes");
const handleHandlerServiceBindingValidate_1 = require("../../../handlers/compact/high/handleHandlerServiceBindingValidate");
const handleHandlerTransportCreate_1 = require("../../../handlers/compact/high/handleHandlerTransportCreate");
const handleHandlerUnitTestResult_1 = require("../../../handlers/compact/high/handleHandlerUnitTestResult");
const handleHandlerUnitTestRun_1 = require("../../../handlers/compact/high/handleHandlerUnitTestRun");
const handleHandlerUnitTestStatus_1 = require("../../../handlers/compact/high/handleHandlerUnitTestStatus");
const handleHandlerUnlock_1 = require("../../../handlers/compact/high/handleHandlerUnlock");
const handleHandlerUpdate_1 = require("../../../handlers/compact/high/handleHandlerUpdate");
const handleHandlerValidate_1 = require("../../../handlers/compact/high/handleHandlerValidate");
const handleCallIcfService_1 = require("../../../handlers/system/high/handleCallIcfService");
const BaseHandlerGroup_js_1 = require("../base/BaseHandlerGroup.js");
/**
 * Handler group for compact facade handlers.
 * Provides unified CRUD router tools by object_type.
 */
class CompactHandlersGroup extends BaseHandlerGroup_js_1.BaseHandlerGroup {
    groupName = 'CompactHandlers';
    getHandlers() {
        const withContext = (handler) => {
            return (args) => handler(this.context, args);
        };
        return [
            {
                toolDefinition: handleHandlerValidate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerValidate_1.handleHandlerValidate),
            },
            {
                toolDefinition: handleHandlerActivate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerActivate_1.handleHandlerActivate),
            },
            {
                toolDefinition: handleHandlerLock_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerLock_1.handleHandlerLock),
            },
            {
                toolDefinition: handleHandlerUnlock_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerUnlock_1.handleHandlerUnlock),
            },
            {
                toolDefinition: handleHandlerCheckRun_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerCheckRun_1.handleHandlerCheckRun),
            },
            {
                toolDefinition: handleHandlerUnitTestRun_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerUnitTestRun_1.handleHandlerUnitTestRun),
            },
            {
                toolDefinition: handleHandlerUnitTestStatus_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerUnitTestStatus_1.handleHandlerUnitTestStatus),
            },
            {
                toolDefinition: handleHandlerUnitTestResult_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerUnitTestResult_1.handleHandlerUnitTestResult),
            },
            {
                toolDefinition: handleHandlerCdsUnitTestStatus_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerCdsUnitTestStatus_1.handleHandlerCdsUnitTestStatus),
            },
            {
                toolDefinition: handleHandlerCdsUnitTestResult_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerCdsUnitTestResult_1.handleHandlerCdsUnitTestResult),
            },
            {
                toolDefinition: handleHandlerProfileRun_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerProfileRun_1.handleHandlerProfileRun),
            },
            {
                toolDefinition: handleHandlerProfileList_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerProfileList_1.handleHandlerProfileList),
            },
            {
                toolDefinition: handleHandlerProfileView_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerProfileView_1.handleHandlerProfileView),
            },
            {
                toolDefinition: handleHandlerDumpList_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerDumpList_1.handleHandlerDumpList),
            },
            {
                toolDefinition: handleHandlerDumpView_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerDumpView_1.handleHandlerDumpView),
            },
            {
                toolDefinition: handleHandlerServiceBindingListTypes_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerServiceBindingListTypes_1.handleHandlerServiceBindingListTypes),
            },
            {
                toolDefinition: handleHandlerServiceBindingValidate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerServiceBindingValidate_1.handleHandlerServiceBindingValidate),
            },
            {
                toolDefinition: handleHandlerTransportCreate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerTransportCreate_1.handleHandlerTransportCreate),
            },
            {
                toolDefinition: handleHandlerCreate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerCreate_1.handleHandlerCreate),
            },
            {
                toolDefinition: handleHandlerGet_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerGet_1.handleHandlerGet),
            },
            {
                toolDefinition: handleHandlerUpdate_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerUpdate_1.handleHandlerUpdate),
            },
            {
                toolDefinition: handleHandlerDelete_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerDelete_1.handleHandlerDelete),
            },
            // field report round 7, F-9 — the analysis set. Without these the facade could not
            // reach 38 % of what one real project actually called, and in particular
            // could not run the inactive-object sweep that every one of their
            // round-closing procedures depends on.
            {
                toolDefinition: handleHandlerQuery_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerQuery_1.handleHandlerQuery),
            },
            {
                toolDefinition: handleHandlerSearch_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerSearch_1.handleHandlerSearch),
            },
            {
                toolDefinition: handleHandlerAtc_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerAtc_1.handleHandlerAtc),
            },
            {
                toolDefinition: handleHandlerRuntime_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerRuntime_1.handleHandlerRuntime),
            },
            {
                toolDefinition: handleHandlerInactiveObjects_1.TOOL_DEFINITION,
                handler: withContext(handleHandlerInactiveObjects_1.handleHandlerInactiveObjects),
            },
            {
                toolDefinition: handleCallIcfService_1.TOOL_DEFINITION,
                handler: withContext(handleCallIcfService_1.handleCallIcfService),
            },
        ];
    }
}
exports.CompactHandlersGroup = CompactHandlersGroup;
//# sourceMappingURL=CompactHandlersGroup.js.map