"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadOnlyHandlersGroup = void 0;
const handleGetAccessControl_1 = require("../../../handlers/access_control/readonly/handleGetAccessControl");
const handleReadBehaviorDefinition_1 = require("../../../handlers/behavior_definition/readonly/handleReadBehaviorDefinition");
const handleReadBehaviorImplementation_1 = require("../../../handlers/behavior_implementation/readonly/handleReadBehaviorImplementation");
const handleReadClass_1 = require("../../../handlers/class/readonly/handleReadClass");
const handleReadDataElement_1 = require("../../../handlers/data_element/readonly/handleReadDataElement");
const handleReadDomain_1 = require("../../../handlers/domain/readonly/handleReadDomain");
const handleGetEnhancementImpl_1 = require("../../../handlers/enhancement/readonly/handleGetEnhancementImpl");
const handleGetEnhancementSpot_1 = require("../../../handlers/enhancement/readonly/handleGetEnhancementSpot");
const handleGetEnhancements_1 = require("../../../handlers/enhancement/readonly/handleGetEnhancements");
const handleReadFunctionGroup_1 = require("../../../handlers/function_group/readonly/handleReadFunctionGroup");
const handleReadFunctionModule_1 = require("../../../handlers/function_module/readonly/handleReadFunctionModule");
const handleGetInclude_1 = require("../../../handlers/include/readonly/handleGetInclude");
const handleGetIncludesList_1 = require("../../../handlers/include/readonly/handleGetIncludesList");
const handleReadInterface_1 = require("../../../handlers/interface/readonly/handleReadInterface");
const handleGetLockObject_1 = require("../../../handlers/lockobject/readonly/handleGetLockObject");
const handleGetMessageClass_1 = require("../../../handlers/messageclass/readonly/handleGetMessageClass");
const handleReadMetadataExtension_1 = require("../../../handlers/metadata_extension/readonly/handleReadMetadataExtension");
const handleGetPackageContents_1 = require("../../../handlers/package/readonly/handleGetPackageContents");
const handleReadPackage_1 = require("../../../handlers/package/readonly/handleReadPackage");
const handleReadProgram_1 = require("../../../handlers/program/readonly/handleReadProgram");
const handleReadServiceBinding_1 = require("../../../handlers/service_binding/readonly/handleReadServiceBinding");
const handleReadServiceDefinition_1 = require("../../../handlers/service_definition/readonly/handleReadServiceDefinition");
const handleReadStructure_1 = require("../../../handlers/structure/readonly/handleReadStructure");
const handleGetTableContents_1 = require("../../../handlers/table/readonly/handleGetTableContents");
const handleGetTableIndexes_1 = require("../../../handlers/table/readonly/handleGetTableIndexes");
const handleGetTableTechnicalSettings_1 = require("../../../handlers/table/readonly/handleGetTableTechnicalSettings");
const handleReadTable_1 = require("../../../handlers/table/readonly/handleReadTable");
const handleGetTransport_1 = require("../../../handlers/transport/readonly/handleGetTransport");
const handleListTransports_1 = require("../../../handlers/transport/readonly/handleListTransports");
const handleReadView_1 = require("../../../handlers/view/readonly/handleReadView");
const handleGetXslt_1 = require("../../../handlers/xslt/readonly/handleGetXslt");
const BaseHandlerGroup_js_1 = require("../base/BaseHandlerGroup.js");
const index_js_1 = require("./strategies/index.js");
/**
 * Handler group for all readonly (read-only) handlers.
 * Contains handlers that only read data without modifying the ABAP system.
 *
 * When other groups (HighLevel / LowLevel / Compact) are also exposed, some
 * readonly handlers semantically duplicate tools from those groups
 * (e.g. ReadFunctionModule vs GetFunctionModule). The group hides such
 * duplicates based on the injected override strategy and the set of tool
 * names contributed by the other groups.
 */
class ReadOnlyHandlersGroup extends BaseHandlerGroup_js_1.BaseHandlerGroup {
    groupName = 'ReadOnlyHandlers';
    overridingToolNames;
    dedupStrategy;
    constructor(context, overridingToolNames = new Set(), dedupStrategy = new index_js_1.NoDedupStrategy()) {
        super(context);
        this.overridingToolNames = overridingToolNames;
        this.dedupStrategy = dedupStrategy;
    }
    /**
     * Gets all readonly handler entries, filtered by the dedup strategy.
     */
    getHandlers() {
        return this.getAllEntries().filter((e) => !this.dedupStrategy.shouldExclude(e, this.overridingToolNames));
    }
    getAllEntries() {
        return [
            // Existing readonly handlers
            {
                toolDefinition: handleGetTableIndexes_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetTableIndexes_1.handleGetTableIndexes)(this.context, args),
            },
            {
                toolDefinition: handleGetTableTechnicalSettings_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetTableTechnicalSettings_1.handleGetTableTechnicalSettings)(this.context, args),
            },
            {
                toolDefinition: handleGetTableContents_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetTableContents_1.handleGetTableContents)(this.context, args),
            },
            {
                toolDefinition: handleGetPackageContents_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetPackageContents_1.handleGetPackageContents)(this.context, args),
            },
            {
                toolDefinition: handleGetInclude_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetInclude_1.handleGetInclude)(this.context, args),
            },
            {
                toolDefinition: handleGetIncludesList_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetIncludesList_1.handleGetIncludesList)(this.context, args),
            },
            {
                toolDefinition: handleGetEnhancements_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetEnhancements_1.handleGetEnhancements)(this.context, args),
            },
            {
                toolDefinition: handleGetEnhancementSpot_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetEnhancementSpot_1.handleGetEnhancementSpot)(this.context, args),
            },
            {
                toolDefinition: handleGetEnhancementImpl_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetEnhancementImpl_1.handleGetEnhancementImpl)(this.context, args),
            },
            {
                toolDefinition: handleGetTransport_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetTransport_1.handleGetTransport)(this.context, args),
            },
            {
                toolDefinition: handleListTransports_1.TOOL_DEFINITION,
                handler: (args) => (0, handleListTransports_1.handleListTransports)(this.context, args),
            },
            // Read object source + metadata handlers
            {
                toolDefinition: handleReadClass_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadClass_1.handleReadClass)(this.context, args),
            },
            {
                toolDefinition: handleReadInterface_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadInterface_1.handleReadInterface)(this.context, args),
            },
            {
                toolDefinition: handleReadProgram_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadProgram_1.handleReadProgram)(this.context, args),
            },
            {
                toolDefinition: handleReadTable_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadTable_1.handleReadTable)(this.context, args),
            },
            {
                toolDefinition: handleReadStructure_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadStructure_1.handleReadStructure)(this.context, args),
            },
            {
                toolDefinition: handleReadView_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadView_1.handleReadView)(this.context, args),
            },
            {
                toolDefinition: handleReadDomain_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadDomain_1.handleReadDomain)(this.context, args),
            },
            {
                toolDefinition: handleReadDataElement_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadDataElement_1.handleReadDataElement)(this.context, args),
            },
            {
                toolDefinition: handleReadFunctionModule_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadFunctionModule_1.handleReadFunctionModule)(this.context, args),
            },
            {
                toolDefinition: handleReadFunctionGroup_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadFunctionGroup_1.handleReadFunctionGroup)(this.context, args),
            },
            {
                toolDefinition: handleReadPackage_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadPackage_1.handleReadPackage)(this.context, args),
            },
            {
                toolDefinition: handleReadServiceDefinition_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadServiceDefinition_1.handleReadServiceDefinition)(this.context, args),
            },
            {
                toolDefinition: handleReadMetadataExtension_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadMetadataExtension_1.handleReadMetadataExtension)(this.context, args),
            },
            {
                toolDefinition: handleReadBehaviorDefinition_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadBehaviorDefinition_1.handleReadBehaviorDefinition)(this.context, args),
            },
            {
                toolDefinition: handleReadBehaviorImplementation_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadBehaviorImplementation_1.handleReadBehaviorImplementation)(this.context, args),
            },
            {
                toolDefinition: handleReadServiceBinding_1.TOOL_DEFINITION,
                handler: (args) => (0, handleReadServiceBinding_1.handleReadServiceBinding)(this.context, args),
            },
            {
                toolDefinition: handleGetXslt_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetXslt_1.handleGetXslt)(this.context, args),
            },
            {
                toolDefinition: handleGetAccessControl_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetAccessControl_1.handleGetAccessControl)(this.context, args),
            },
            {
                toolDefinition: handleGetMessageClass_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetMessageClass_1.handleGetMessageClass)(this.context, args),
            },
            {
                toolDefinition: handleGetLockObject_1.TOOL_DEFINITION,
                handler: (args) => (0, handleGetLockObject_1.handleGetLockObject)(this.context, args),
            },
        ];
    }
}
exports.ReadOnlyHandlersGroup = ReadOnlyHandlersGroup;
//# sourceMappingURL=ReadOnlyHandlersGroup.js.map