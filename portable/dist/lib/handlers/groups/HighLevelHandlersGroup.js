"use strict";
// Per-type activate handlers (reused from low-level)
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighLevelHandlersGroup = void 0;
const handleCheckAccessControl_1 = require("../../../handlers/access_control/high/handleCheckAccessControl");
const handleCreateAccessControl_1 = require("../../../handlers/access_control/high/handleCreateAccessControl");
const handleDeleteAccessControl_1 = require("../../../handlers/access_control/high/handleDeleteAccessControl");
const handleUpdateAccessControl_1 = require("../../../handlers/access_control/high/handleUpdateAccessControl");
const handleActivateAccessControl_1 = require("../../../handlers/access_control/low/handleActivateAccessControl");
const handleCheckBehaviorDefinition_1 = require("../../../handlers/behavior_definition/high/handleCheckBehaviorDefinition");
const handleCreateBehaviorDefinition_1 = require("../../../handlers/behavior_definition/high/handleCreateBehaviorDefinition");
const handleDeleteBehaviorDefinition_1 = require("../../../handlers/behavior_definition/high/handleDeleteBehaviorDefinition");
const handleGetBehaviorDefinition_1 = require("../../../handlers/behavior_definition/high/handleGetBehaviorDefinition");
const handleUpdateBehaviorDefinition_1 = require("../../../handlers/behavior_definition/high/handleUpdateBehaviorDefinition");
const handleActivateBehaviorDefinition_1 = require("../../../handlers/behavior_definition/low/handleActivateBehaviorDefinition");
const handleCreateBehaviorImplementation_1 = require("../../../handlers/behavior_implementation/high/handleCreateBehaviorImplementation");
const handleDeleteBehaviorImplementation_1 = require("../../../handlers/behavior_implementation/high/handleDeleteBehaviorImplementation");
const handleGetBehaviorImplementation_1 = require("../../../handlers/behavior_implementation/high/handleGetBehaviorImplementation");
const handleUpdateBehaviorImplementation_1 = require("../../../handlers/behavior_implementation/high/handleUpdateBehaviorImplementation");
const handleCheckClass_1 = require("../../../handlers/class/high/handleCheckClass");
const handleCreateClass_1 = require("../../../handlers/class/high/handleCreateClass");
const handleDeleteClass_1 = require("../../../handlers/class/high/handleDeleteClass");
const handleDeleteLocalDefinitions_1 = require("../../../handlers/class/high/handleDeleteLocalDefinitions");
const handleDeleteLocalMacros_1 = require("../../../handlers/class/high/handleDeleteLocalMacros");
const handleDeleteLocalTestClass_1 = require("../../../handlers/class/high/handleDeleteLocalTestClass");
const handleDeleteLocalTypes_1 = require("../../../handlers/class/high/handleDeleteLocalTypes");
const handleGetClass_1 = require("../../../handlers/class/high/handleGetClass");
const handleGetLocalDefinitions_1 = require("../../../handlers/class/high/handleGetLocalDefinitions");
const handleGetLocalMacros_1 = require("../../../handlers/class/high/handleGetLocalMacros");
const handleGetLocalTestClass_1 = require("../../../handlers/class/high/handleGetLocalTestClass");
const handleGetLocalTypes_1 = require("../../../handlers/class/high/handleGetLocalTypes");
const handleUpdateClass_1 = require("../../../handlers/class/high/handleUpdateClass");
const handleUpdateLocalDefinitions_1 = require("../../../handlers/class/high/handleUpdateLocalDefinitions");
const handleUpdateLocalMacros_1 = require("../../../handlers/class/high/handleUpdateLocalMacros");
const handleUpdateLocalTestClass_1 = require("../../../handlers/class/high/handleUpdateLocalTestClass");
const handleUpdateLocalTypes_1 = require("../../../handlers/class/high/handleUpdateLocalTypes");
const handleActivateClass_1 = require("../../../handlers/class/low/handleActivateClass");
const handleActivateObjects_1 = require("../../../handlers/common/high/handleActivateObjects");
const handleCheckDataElement_1 = require("../../../handlers/data_element/high/handleCheckDataElement");
const handleCreateDataElement_1 = require("../../../handlers/data_element/high/handleCreateDataElement");
const handleDeleteDataElement_1 = require("../../../handlers/data_element/high/handleDeleteDataElement");
const handleGetDataElement_1 = require("../../../handlers/data_element/high/handleGetDataElement");
const handleUpdateDataElement_1 = require("../../../handlers/data_element/high/handleUpdateDataElement");
const handleActivateDataElement_1 = require("../../../handlers/data_element/low/handleActivateDataElement");
const handleCheckMetadataExtension_1 = require("../../../handlers/ddlx/high/handleCheckMetadataExtension");
const handleCreateMetadataExtension_1 = require("../../../handlers/ddlx/high/handleCreateMetadataExtension");
const handleUpdateMetadataExtension_1 = require("../../../handlers/ddlx/high/handleUpdateMetadataExtension");
const handleActivateMetadataExtension_1 = require("../../../handlers/ddlx/low/handleActivateMetadataExtension");
const handleCheckDomain_1 = require("../../../handlers/domain/high/handleCheckDomain");
const handleCreateDomain_1 = require("../../../handlers/domain/high/handleCreateDomain");
const handleDeleteDomain_1 = require("../../../handlers/domain/high/handleDeleteDomain");
const handleGetDomain_1 = require("../../../handlers/domain/high/handleGetDomain");
const handleUpdateDomain_1 = require("../../../handlers/domain/high/handleUpdateDomain");
const handleActivateDomain_1 = require("../../../handlers/domain/low/handleActivateDomain");
const handleCheckFunctionGroup_1 = require("../../../handlers/function/high/handleCheckFunctionGroup");
const handleCheckFunctionModule_1 = require("../../../handlers/function/high/handleCheckFunctionModule");
const handleCreateFunctionGroup_1 = require("../../../handlers/function/high/handleCreateFunctionGroup");
const handleCreateFunctionModule_1 = require("../../../handlers/function/high/handleCreateFunctionModule");
const handleUpdateFunctionGroup_1 = require("../../../handlers/function/high/handleUpdateFunctionGroup");
const handleUpdateFunctionModule_1 = require("../../../handlers/function/high/handleUpdateFunctionModule");
const handleActivateFunctionGroup_1 = require("../../../handlers/function/low/handleActivateFunctionGroup");
const handleActivateFunctionModule_1 = require("../../../handlers/function/low/handleActivateFunctionModule");
const handleDeleteFunctionGroup_1 = require("../../../handlers/function_group/high/handleDeleteFunctionGroup");
const handleGetFunctionGroup_1 = require("../../../handlers/function_group/high/handleGetFunctionGroup");
const handleDeleteFunctionModule_1 = require("../../../handlers/function_module/high/handleDeleteFunctionModule");
const handleGetFunctionModule_1 = require("../../../handlers/function_module/high/handleGetFunctionModule");
const handleGenerateRepoObjects_1 = require("../../../handlers/generator/high/handleGenerateRepoObjects");
const handleCheckInterface_1 = require("../../../handlers/interface/high/handleCheckInterface");
const handleCreateInterface_1 = require("../../../handlers/interface/high/handleCreateInterface");
const handleDeleteInterface_1 = require("../../../handlers/interface/high/handleDeleteInterface");
const handleGetInterface_1 = require("../../../handlers/interface/high/handleGetInterface");
const handleUpdateInterface_1 = require("../../../handlers/interface/high/handleUpdateInterface");
const handleActivateInterface_1 = require("../../../handlers/interface/low/handleActivateInterface");
const handleCreateLockObject_1 = require("../../../handlers/lockobject/high/handleCreateLockObject");
const handleDeleteLockObject_1 = require("../../../handlers/lockobject/high/handleDeleteLockObject");
const handleUpdateLockObject_1 = require("../../../handlers/lockobject/high/handleUpdateLockObject");
const handleActivateLockObject_1 = require("../../../handlers/lockobject/low/handleActivateLockObject");
const handleAddMessage_1 = require("../../../handlers/messageclass/high/handleAddMessage");
const handleCreateMessageClass_1 = require("../../../handlers/messageclass/high/handleCreateMessageClass");
const handleDeleteMessageClass_1 = require("../../../handlers/messageclass/high/handleDeleteMessageClass");
const handleUpdateMessage_1 = require("../../../handlers/messageclass/high/handleUpdateMessage");
const handleUpdateMessageClass_1 = require("../../../handlers/messageclass/high/handleUpdateMessageClass");
const handleDeleteMetadataExtension_1 = require("../../../handlers/metadata_extension/high/handleDeleteMetadataExtension");
const handleGetMetadataExtension_1 = require("../../../handlers/metadata_extension/high/handleGetMetadataExtension");
// Import high-level handlers
// Import TOOL_DEFINITION from handlers
const handleCheckPackage_1 = require("../../../handlers/package/high/handleCheckPackage");
const handleCreatePackage_1 = require("../../../handlers/package/high/handleCreatePackage");
const handleDeletePackage_1 = require("../../../handlers/package/high/handleDeletePackage");
const handleGetPackage_1 = require("../../../handlers/package/high/handleGetPackage");
const handleCheckProgram_1 = require("../../../handlers/program/high/handleCheckProgram");
const handleCreateProgram_1 = require("../../../handlers/program/high/handleCreateProgram");
const handleDeleteProgram_1 = require("../../../handlers/program/high/handleDeleteProgram");
const handleGetProgram_1 = require("../../../handlers/program/high/handleGetProgram");
const handleUpdateProgram_1 = require("../../../handlers/program/high/handleUpdateProgram");
const handleActivateProgram_1 = require("../../../handlers/program/low/handleActivateProgram");
const handleCreateServiceBinding_1 = require("../../../handlers/service_binding/high/handleCreateServiceBinding");
const handleDeleteServiceBinding_1 = require("../../../handlers/service_binding/high/handleDeleteServiceBinding");
const handleGetServiceBinding_1 = require("../../../handlers/service_binding/high/handleGetServiceBinding");
const handleListServiceBindingTypes_1 = require("../../../handlers/service_binding/high/handleListServiceBindingTypes");
const handlePublishServiceBinding_1 = require("../../../handlers/service_binding/high/handlePublishServiceBinding");
const handleUnpublishServiceBinding_1 = require("../../../handlers/service_binding/high/handleUnpublishServiceBinding");
const handleUpdateServiceBinding_1 = require("../../../handlers/service_binding/high/handleUpdateServiceBinding");
const handleValidateServiceBinding_1 = require("../../../handlers/service_binding/high/handleValidateServiceBinding");
const handleActivateServiceBinding_1 = require("../../../handlers/service_binding/low/handleActivateServiceBinding");
const handleCreateServiceDefinition_1 = require("../../../handlers/service_definition/high/handleCreateServiceDefinition");
const handleDeleteServiceDefinition_1 = require("../../../handlers/service_definition/high/handleDeleteServiceDefinition");
const handleGetServiceDefinition_1 = require("../../../handlers/service_definition/high/handleGetServiceDefinition");
const handleUpdateServiceDefinition_1 = require("../../../handlers/service_definition/high/handleUpdateServiceDefinition");
const handleActivateServiceDefinition_1 = require("../../../handlers/service_definition/low/handleActivateServiceDefinition");
const handleCheckStructure_1 = require("../../../handlers/structure/high/handleCheckStructure");
const handleCreateStructure_1 = require("../../../handlers/structure/high/handleCreateStructure");
const handleDeleteStructure_1 = require("../../../handlers/structure/high/handleDeleteStructure");
const handleGetStructure_1 = require("../../../handlers/structure/high/handleGetStructure");
const handleUpdateStructure_1 = require("../../../handlers/structure/high/handleUpdateStructure");
const handleActivateStructure_1 = require("../../../handlers/structure/low/handleActivateStructure");
const handleCallIcfService_1 = require("../../../handlers/system/high/handleCallIcfService");
const handleSetPrettyPrinterSettings_1 = require("../../../handlers/system/high/handleSetPrettyPrinterSettings");
const handleCheckTable_1 = require("../../../handlers/table/high/handleCheckTable");
const handleCreateTable_1 = require("../../../handlers/table/high/handleCreateTable");
const handleCreateTableIndex_1 = require("../../../handlers/table/high/handleCreateTableIndex");
const handleDeleteTable_1 = require("../../../handlers/table/high/handleDeleteTable");
const handleDeleteTableIndex_1 = require("../../../handlers/table/high/handleDeleteTableIndex");
const handleGetTable_1 = require("../../../handlers/table/high/handleGetTable");
const handleSetTableTechnicalSettings_1 = require("../../../handlers/table/high/handleSetTableTechnicalSettings");
const handleUpdateTable_1 = require("../../../handlers/table/high/handleUpdateTable");
const handleUpdateTableIndex_1 = require("../../../handlers/table/high/handleUpdateTableIndex");
const handleActivateTable_1 = require("../../../handlers/table/low/handleActivateTable");
const handleCreateTableType_1 = require("../../../handlers/tabletype/high/handleCreateTableType");
const handleDeleteTableType_1 = require("../../../handlers/tabletype/high/handleDeleteTableType");
const handleAddTransportUser_1 = require("../../../handlers/transport/high/handleAddTransportUser");
const handleCreateTransport_1 = require("../../../handlers/transport/high/handleCreateTransport");
const handleDeleteTransport_1 = require("../../../handlers/transport/high/handleDeleteTransport");
const handleReleaseTransport_1 = require("../../../handlers/transport/high/handleReleaseTransport");
const handleSetTransportOwner_1 = require("../../../handlers/transport/high/handleSetTransportOwner");
const handleCreateCdsUnitTest_1 = require("../../../handlers/unit_test/high/handleCreateCdsUnitTest");
const handleCreateUnitTest_1 = require("../../../handlers/unit_test/high/handleCreateUnitTest");
const handleDeleteCdsUnitTest_1 = require("../../../handlers/unit_test/high/handleDeleteCdsUnitTest");
const handleDeleteUnitTest_1 = require("../../../handlers/unit_test/high/handleDeleteUnitTest");
const handleGetCdsUnitTest_1 = require("../../../handlers/unit_test/high/handleGetCdsUnitTest");
const handleGetCdsUnitTestResult_1 = require("../../../handlers/unit_test/high/handleGetCdsUnitTestResult");
const handleGetCdsUnitTestStatus_1 = require("../../../handlers/unit_test/high/handleGetCdsUnitTestStatus");
const handleGetUnitTest_1 = require("../../../handlers/unit_test/high/handleGetUnitTest");
const handleGetUnitTestResult_1 = require("../../../handlers/unit_test/high/handleGetUnitTestResult");
const handleGetUnitTestStatus_1 = require("../../../handlers/unit_test/high/handleGetUnitTestStatus");
const handleRunUnitTest_1 = require("../../../handlers/unit_test/high/handleRunUnitTest");
const handleUpdateCdsUnitTest_1 = require("../../../handlers/unit_test/high/handleUpdateCdsUnitTest");
const handleUpdateUnitTest_1 = require("../../../handlers/unit_test/high/handleUpdateUnitTest");
const handleCheckView_1 = require("../../../handlers/view/high/handleCheckView");
const handleCreateView_1 = require("../../../handlers/view/high/handleCreateView");
const handleDeleteView_1 = require("../../../handlers/view/high/handleDeleteView");
const handleGetView_1 = require("../../../handlers/view/high/handleGetView");
const handleUpdateView_1 = require("../../../handlers/view/high/handleUpdateView");
const handleActivateView_1 = require("../../../handlers/view/low/handleActivateView");
const handleCreateXslt_1 = require("../../../handlers/xslt/high/handleCreateXslt");
const handleDeleteXslt_1 = require("../../../handlers/xslt/high/handleDeleteXslt");
const handleUpdateXslt_1 = require("../../../handlers/xslt/high/handleUpdateXslt");
const handleActivateXslt_1 = require("../../../handlers/xslt/low/handleActivateXslt");
const BaseHandlerGroup_js_1 = require("../base/BaseHandlerGroup.js");
/**
 * Handler group for all high-level handlers
 * Contains handlers that perform CRUD operations using high-level APIs
 */
class HighLevelHandlersGroup extends BaseHandlerGroup_js_1.BaseHandlerGroup {
    groupName = 'HighLevelHandlers';
    /**
     * Gets all high-level handler entries
     */
    getHandlers() {
        const withContext = (handler) => {
            return (args) => handler(this.context, args);
        };
        return [
            // Common — group activation
            {
                toolDefinition: handleActivateObjects_1.TOOL_DEFINITION,
                handler: withContext(handleActivateObjects_1.handleActivateObjects),
            },
            // Per-type activation (reused from low-level, with high-level names/descriptions)
            {
                toolDefinition: {
                    ...handleActivateDomain_1.TOOL_DEFINITION,
                    name: 'ActivateDomain',
                    description: 'Activate an ABAP domain. Use after CreateDomain or UpdateDomain if the object remains inactive.',
                },
                handler: withContext(handleActivateDomain_1.handleActivateDomain),
            },
            {
                toolDefinition: {
                    ...handleActivateDataElement_1.TOOL_DEFINITION,
                    name: 'ActivateDataElement',
                    description: 'Activate an ABAP data element. Use after CreateDataElement or UpdateDataElement if the object remains inactive.',
                },
                handler: withContext(handleActivateDataElement_1.handleActivateDataElement),
            },
            {
                toolDefinition: {
                    ...handleActivateTable_1.TOOL_DEFINITION,
                    name: 'ActivateTable',
                    description: 'Activate an ABAP table. Use after CreateTable or UpdateTable if the object remains inactive.',
                },
                handler: withContext(handleActivateTable_1.handleActivateTable),
            },
            {
                toolDefinition: {
                    ...handleActivateStructure_1.TOOL_DEFINITION,
                    name: 'ActivateStructure',
                    description: 'Activate an ABAP structure. Use after CreateStructure or UpdateStructure if the object remains inactive.',
                },
                handler: withContext(handleActivateStructure_1.handleActivateStructure),
            },
            {
                toolDefinition: {
                    ...handleActivateView_1.TOOL_DEFINITION,
                    name: 'ActivateView',
                    description: 'Activate a CDS view. Use after CreateView or UpdateView if the object remains inactive.',
                },
                handler: withContext(handleActivateView_1.handleActivateView),
            },
            {
                toolDefinition: {
                    ...handleActivateClass_1.TOOL_DEFINITION,
                    name: 'ActivateClass',
                    description: 'Activate an ABAP class. Use after CreateClass or UpdateClass if the object remains inactive.',
                },
                handler: withContext(handleActivateClass_1.handleActivateClass),
            },
            {
                toolDefinition: {
                    ...handleActivateInterface_1.TOOL_DEFINITION,
                    name: 'ActivateInterface',
                    description: 'Activate an ABAP interface. Use after CreateInterface or UpdateInterface if the object remains inactive.',
                },
                handler: withContext(handleActivateInterface_1.handleActivateInterface),
            },
            {
                toolDefinition: {
                    ...handleActivateProgram_1.TOOL_DEFINITION,
                    name: 'ActivateProgram',
                    description: 'Activate an ABAP program. Use after CreateProgram or UpdateProgram if the object remains inactive.',
                },
                handler: withContext(handleActivateProgram_1.handleActivateProgram),
            },
            {
                toolDefinition: {
                    ...handleActivateFunctionModule_1.TOOL_DEFINITION,
                    name: 'ActivateFunctionModule',
                    description: 'Activate an ABAP function module. Use after UpdateFunctionModule if the object remains inactive.',
                },
                handler: withContext(handleActivateFunctionModule_1.handleActivateFunctionModule),
            },
            {
                toolDefinition: {
                    ...handleActivateFunctionGroup_1.TOOL_DEFINITION,
                    name: 'ActivateFunctionGroup',
                    description: 'Activate an ABAP function group. Use after CreateFunctionGroup or UpdateFunctionGroup if the object remains inactive.',
                },
                handler: withContext(handleActivateFunctionGroup_1.handleActivateFunctionGroup),
            },
            {
                toolDefinition: {
                    ...handleActivateBehaviorDefinition_1.TOOL_DEFINITION,
                    name: 'ActivateBehaviorDefinition',
                    description: 'Activate a RAP behavior definition. Use after CreateBehaviorDefinition or UpdateBehaviorDefinition if the object remains inactive.',
                },
                handler: withContext(handleActivateBehaviorDefinition_1.handleActivateBehaviorDefinition),
            },
            {
                toolDefinition: {
                    ...handleActivateMetadataExtension_1.TOOL_DEFINITION,
                    name: 'ActivateMetadataExtension',
                    description: 'Activate a CDS metadata extension. Use after CreateMetadataExtension or UpdateMetadataExtension if the object remains inactive.',
                },
                handler: withContext(handleActivateMetadataExtension_1.handleActivateMetadataExtension),
            },
            {
                toolDefinition: {
                    ...handleActivateServiceDefinition_1.TOOL_DEFINITION,
                    name: 'ActivateServiceDefinition',
                    description: 'Activate an ABAP service definition. Use after CreateServiceDefinition or UpdateServiceDefinition if the object remains inactive.',
                },
                handler: withContext(handleActivateServiceDefinition_1.handleActivateServiceDefinition),
            },
            {
                toolDefinition: {
                    ...handleActivateServiceBinding_1.TOOL_DEFINITION,
                    name: 'ActivateServiceBinding',
                    description: 'Activate an ABAP service binding. Use after CreateServiceBinding or UpdateServiceBinding if the object remains inactive.',
                },
                handler: withContext(handleActivateServiceBinding_1.handleActivateServiceBinding),
            },
            {
                toolDefinition: handleCreatePackage_1.TOOL_DEFINITION,
                handler: withContext(handleCreatePackage_1.handleCreatePackage),
            },
            {
                toolDefinition: handleGetPackage_1.TOOL_DEFINITION,
                handler: withContext(handleGetPackage_1.handleGetPackage),
            },
            {
                toolDefinition: handleDeletePackage_1.TOOL_DEFINITION,
                handler: withContext(handleDeletePackage_1.handleDeletePackage),
            },
            {
                toolDefinition: handleCreateAccessControl_1.TOOL_DEFINITION,
                handler: withContext(handleCreateAccessControl_1.handleCreateAccessControl),
            },
            {
                toolDefinition: handleUpdateAccessControl_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateAccessControl_1.handleUpdateAccessControl),
            },
            {
                toolDefinition: handleDeleteAccessControl_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteAccessControl_1.handleDeleteAccessControl),
            },
            {
                toolDefinition: handleCheckAccessControl_1.TOOL_DEFINITION,
                handler: withContext(handleCheckAccessControl_1.handleCheckAccessControl),
            },
            {
                toolDefinition: handleActivateAccessControl_1.TOOL_DEFINITION,
                handler: withContext(handleActivateAccessControl_1.handleActivateAccessControl),
            },
            {
                toolDefinition: handleCreateDomain_1.TOOL_DEFINITION,
                handler: withContext(handleCreateDomain_1.handleCreateDomain),
            },
            {
                toolDefinition: handleGetDomain_1.TOOL_DEFINITION,
                handler: withContext(handleGetDomain_1.handleGetDomain),
            },
            {
                toolDefinition: handleUpdateDomain_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateDomain_1.handleUpdateDomain),
            },
            {
                toolDefinition: handleDeleteDomain_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteDomain_1.handleDeleteDomain),
            },
            {
                toolDefinition: handleCreateDataElement_1.TOOL_DEFINITION,
                handler: withContext(handleCreateDataElement_1.handleCreateDataElement),
            },
            {
                toolDefinition: handleGetDataElement_1.TOOL_DEFINITION,
                handler: withContext(handleGetDataElement_1.handleGetDataElement),
            },
            {
                toolDefinition: handleUpdateDataElement_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateDataElement_1.handleUpdateDataElement),
            },
            {
                toolDefinition: handleDeleteDataElement_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteDataElement_1.handleDeleteDataElement),
            },
            {
                toolDefinition: handleCreateTransport_1.TOOL_DEFINITION,
                handler: withContext(handleCreateTransport_1.handleCreateTransport),
            },
            {
                toolDefinition: handleReleaseTransport_1.TOOL_DEFINITION,
                handler: withContext(handleReleaseTransport_1.handleReleaseTransport),
            },
            {
                toolDefinition: handleDeleteTransport_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteTransport_1.handleDeleteTransport),
            },
            {
                toolDefinition: handleSetTransportOwner_1.TOOL_DEFINITION,
                handler: withContext(handleSetTransportOwner_1.handleSetTransportOwner),
            },
            {
                toolDefinition: handleAddTransportUser_1.TOOL_DEFINITION,
                handler: withContext(handleAddTransportUser_1.handleAddTransportUser),
            },
            {
                toolDefinition: handleGenerateRepoObjects_1.TOOL_DEFINITION,
                handler: withContext(handleGenerateRepoObjects_1.handleGenerateRepoObjects),
            },
            {
                toolDefinition: handleSetPrettyPrinterSettings_1.TOOL_DEFINITION,
                handler: withContext(handleSetPrettyPrinterSettings_1.handleSetPrettyPrinterSettings),
            },
            {
                toolDefinition: handleCallIcfService_1.TOOL_DEFINITION,
                handler: withContext(handleCallIcfService_1.handleCallIcfService),
            },
            {
                toolDefinition: handleCreateTable_1.TOOL_DEFINITION,
                handler: withContext(handleCreateTable_1.handleCreateTable),
            },
            {
                toolDefinition: handleGetTable_1.TOOL_DEFINITION,
                handler: withContext(handleGetTable_1.handleGetTable),
            },
            {
                toolDefinition: handleUpdateTable_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateTable_1.handleUpdateTable),
            },
            {
                toolDefinition: handleDeleteTable_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteTable_1.handleDeleteTable),
            },
            {
                toolDefinition: handleCreateStructure_1.TOOL_DEFINITION,
                handler: withContext(handleCreateStructure_1.handleCreateStructure),
            },
            {
                toolDefinition: handleGetStructure_1.TOOL_DEFINITION,
                handler: withContext(handleGetStructure_1.handleGetStructure),
            },
            {
                toolDefinition: handleUpdateStructure_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateStructure_1.handleUpdateStructure),
            },
            {
                toolDefinition: handleDeleteStructure_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteStructure_1.handleDeleteStructure),
            },
            {
                toolDefinition: handleCreateView_1.TOOL_DEFINITION,
                handler: withContext(handleCreateView_1.handleCreateView),
            },
            {
                toolDefinition: handleGetView_1.TOOL_DEFINITION,
                handler: withContext(handleGetView_1.handleGetView),
            },
            {
                toolDefinition: handleUpdateView_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateView_1.handleUpdateView),
            },
            {
                toolDefinition: handleDeleteView_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteView_1.handleDeleteView),
            },
            {
                toolDefinition: handleCreateServiceDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleCreateServiceDefinition_1.handleCreateServiceDefinition),
            },
            {
                toolDefinition: handleGetServiceDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleGetServiceDefinition_1.handleGetServiceDefinition),
            },
            {
                toolDefinition: handleUpdateServiceDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateServiceDefinition_1.handleUpdateServiceDefinition),
            },
            {
                toolDefinition: handleDeleteServiceDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteServiceDefinition_1.handleDeleteServiceDefinition),
            },
            {
                toolDefinition: handleCreateServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleCreateServiceBinding_1.handleCreateServiceBinding),
            },
            {
                toolDefinition: handleListServiceBindingTypes_1.TOOL_DEFINITION,
                handler: withContext(handleListServiceBindingTypes_1.handleListServiceBindingTypes),
            },
            {
                toolDefinition: handleGetServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleGetServiceBinding_1.handleGetServiceBinding),
            },
            {
                toolDefinition: handleUpdateServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateServiceBinding_1.handleUpdateServiceBinding),
            },
            {
                toolDefinition: handleValidateServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleValidateServiceBinding_1.handleValidateServiceBinding),
            },
            {
                toolDefinition: handlePublishServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handlePublishServiceBinding_1.handlePublishServiceBinding),
            },
            {
                toolDefinition: handleUnpublishServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleUnpublishServiceBinding_1.handleUnpublishServiceBinding),
            },
            {
                toolDefinition: handleDeleteServiceBinding_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteServiceBinding_1.handleDeleteServiceBinding),
            },
            {
                toolDefinition: handleGetClass_1.TOOL_DEFINITION,
                handler: withContext(handleGetClass_1.handleGetClass),
            },
            {
                toolDefinition: handleCreateClass_1.TOOL_DEFINITION,
                handler: withContext(handleCreateClass_1.handleCreateClass),
            },
            {
                toolDefinition: handleUpdateClass_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateClass_1.handleUpdateClass),
            },
            {
                toolDefinition: handleDeleteClass_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteClass_1.handleDeleteClass),
            },
            {
                toolDefinition: handleCreateUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleCreateUnitTest_1.handleCreateUnitTest),
            },
            {
                toolDefinition: handleRunUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleRunUnitTest_1.handleRunUnitTest),
            },
            {
                toolDefinition: handleGetUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleGetUnitTest_1.handleGetUnitTest),
            },
            {
                toolDefinition: handleGetUnitTestStatus_1.TOOL_DEFINITION,
                handler: withContext(handleGetUnitTestStatus_1.handleGetUnitTestStatus),
            },
            {
                toolDefinition: handleGetUnitTestResult_1.TOOL_DEFINITION,
                handler: withContext(handleGetUnitTestResult_1.handleGetUnitTestResult),
            },
            {
                toolDefinition: handleUpdateUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateUnitTest_1.handleUpdateUnitTest),
            },
            {
                toolDefinition: handleDeleteUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteUnitTest_1.handleDeleteUnitTest),
            },
            {
                toolDefinition: handleCreateCdsUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleCreateCdsUnitTest_1.handleCreateCdsUnitTest),
            },
            {
                toolDefinition: handleGetCdsUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleGetCdsUnitTest_1.handleGetCdsUnitTest),
            },
            {
                toolDefinition: handleGetCdsUnitTestStatus_1.TOOL_DEFINITION,
                handler: withContext(handleGetCdsUnitTestStatus_1.handleGetCdsUnitTestStatus),
            },
            {
                toolDefinition: handleGetCdsUnitTestResult_1.TOOL_DEFINITION,
                handler: withContext(handleGetCdsUnitTestResult_1.handleGetCdsUnitTestResult),
            },
            {
                toolDefinition: handleUpdateCdsUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateCdsUnitTest_1.handleUpdateCdsUnitTest),
            },
            {
                toolDefinition: handleDeleteCdsUnitTest_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteCdsUnitTest_1.handleDeleteCdsUnitTest),
            },
            {
                toolDefinition: handleGetLocalTestClass_1.TOOL_DEFINITION,
                handler: withContext(handleGetLocalTestClass_1.handleGetLocalTestClass),
            },
            {
                toolDefinition: handleUpdateLocalTestClass_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateLocalTestClass_1.handleUpdateLocalTestClass),
            },
            {
                toolDefinition: handleDeleteLocalTestClass_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteLocalTestClass_1.handleDeleteLocalTestClass),
            },
            {
                toolDefinition: handleGetLocalTypes_1.TOOL_DEFINITION,
                handler: withContext(handleGetLocalTypes_1.handleGetLocalTypes),
            },
            {
                toolDefinition: handleUpdateLocalTypes_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateLocalTypes_1.handleUpdateLocalTypes),
            },
            {
                toolDefinition: handleDeleteLocalTypes_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteLocalTypes_1.handleDeleteLocalTypes),
            },
            {
                toolDefinition: handleGetLocalDefinitions_1.TOOL_DEFINITION,
                handler: withContext(handleGetLocalDefinitions_1.handleGetLocalDefinitions),
            },
            {
                toolDefinition: handleUpdateLocalDefinitions_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateLocalDefinitions_1.handleUpdateLocalDefinitions),
            },
            {
                toolDefinition: handleDeleteLocalDefinitions_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteLocalDefinitions_1.handleDeleteLocalDefinitions),
            },
            {
                toolDefinition: handleGetLocalMacros_1.TOOL_DEFINITION,
                handler: withContext(handleGetLocalMacros_1.handleGetLocalMacros),
            },
            {
                toolDefinition: handleUpdateLocalMacros_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateLocalMacros_1.handleUpdateLocalMacros),
            },
            {
                toolDefinition: handleDeleteLocalMacros_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteLocalMacros_1.handleDeleteLocalMacros),
            },
            {
                toolDefinition: handleCreateProgram_1.TOOL_DEFINITION,
                handler: withContext(handleCreateProgram_1.handleCreateProgram),
            },
            {
                toolDefinition: handleGetProgram_1.TOOL_DEFINITION,
                handler: withContext(handleGetProgram_1.handleGetProgram),
            },
            {
                toolDefinition: handleUpdateProgram_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateProgram_1.handleUpdateProgram),
            },
            {
                toolDefinition: handleDeleteProgram_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteProgram_1.handleDeleteProgram),
            },
            {
                toolDefinition: handleCreateInterface_1.TOOL_DEFINITION,
                handler: withContext(handleCreateInterface_1.handleCreateInterface),
            },
            {
                toolDefinition: handleGetInterface_1.TOOL_DEFINITION,
                handler: withContext(handleGetInterface_1.handleGetInterface),
            },
            {
                toolDefinition: handleUpdateInterface_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateInterface_1.handleUpdateInterface),
            },
            {
                toolDefinition: handleDeleteInterface_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteInterface_1.handleDeleteInterface),
            },
            {
                toolDefinition: handleCreateFunctionGroup_1.TOOL_DEFINITION,
                handler: withContext(handleCreateFunctionGroup_1.handleCreateFunctionGroup),
            },
            {
                toolDefinition: handleGetFunctionGroup_1.TOOL_DEFINITION,
                handler: withContext(handleGetFunctionGroup_1.handleGetFunctionGroup),
            },
            {
                toolDefinition: handleUpdateFunctionGroup_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateFunctionGroup_1.handleUpdateFunctionGroup),
            },
            {
                toolDefinition: handleDeleteFunctionGroup_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteFunctionGroup_1.handleDeleteFunctionGroup),
            },
            {
                toolDefinition: handleCreateFunctionModule_1.TOOL_DEFINITION,
                handler: withContext(handleCreateFunctionModule_1.handleCreateFunctionModule),
            },
            {
                toolDefinition: handleGetFunctionModule_1.TOOL_DEFINITION,
                handler: withContext(handleGetFunctionModule_1.handleGetFunctionModule),
            },
            {
                toolDefinition: handleUpdateFunctionModule_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateFunctionModule_1.handleUpdateFunctionModule),
            },
            {
                toolDefinition: handleDeleteFunctionModule_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteFunctionModule_1.handleDeleteFunctionModule),
            },
            {
                toolDefinition: handleCreateBehaviorDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleCreateBehaviorDefinition_1.handleCreateBehaviorDefinition),
            },
            {
                toolDefinition: handleGetBehaviorDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleGetBehaviorDefinition_1.handleGetBehaviorDefinition),
            },
            {
                toolDefinition: handleUpdateBehaviorDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateBehaviorDefinition_1.handleUpdateBehaviorDefinition),
            },
            {
                toolDefinition: handleDeleteBehaviorDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteBehaviorDefinition_1.handleDeleteBehaviorDefinition),
            },
            {
                toolDefinition: handleCreateBehaviorImplementation_1.TOOL_DEFINITION,
                handler: withContext(handleCreateBehaviorImplementation_1.handleCreateBehaviorImplementation),
            },
            {
                toolDefinition: handleGetBehaviorImplementation_1.TOOL_DEFINITION,
                handler: withContext(handleGetBehaviorImplementation_1.handleGetBehaviorImplementation),
            },
            {
                toolDefinition: handleUpdateBehaviorImplementation_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateBehaviorImplementation_1.handleUpdateBehaviorImplementation),
            },
            {
                toolDefinition: handleDeleteBehaviorImplementation_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteBehaviorImplementation_1.handleDeleteBehaviorImplementation),
            },
            {
                toolDefinition: handleCreateMetadataExtension_1.TOOL_DEFINITION,
                handler: withContext(handleCreateMetadataExtension_1.handleCreateMetadataExtension),
            },
            {
                toolDefinition: handleGetMetadataExtension_1.TOOL_DEFINITION,
                handler: withContext(handleGetMetadataExtension_1.handleGetMetadataExtension),
            },
            {
                toolDefinition: handleUpdateMetadataExtension_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateMetadataExtension_1.handleUpdateMetadataExtension),
            },
            {
                toolDefinition: handleDeleteMetadataExtension_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteMetadataExtension_1.handleDeleteMetadataExtension),
            },
            // Per-type Check handlers (high-level)
            {
                toolDefinition: handleCheckBehaviorDefinition_1.TOOL_DEFINITION,
                handler: withContext(handleCheckBehaviorDefinition_1.handleCheckBehaviorDefinition),
            },
            {
                toolDefinition: handleCheckClass_1.TOOL_DEFINITION,
                handler: withContext(handleCheckClass_1.handleCheckClass),
            },
            {
                toolDefinition: handleCheckDataElement_1.TOOL_DEFINITION,
                handler: withContext(handleCheckDataElement_1.handleCheckDataElement),
            },
            {
                toolDefinition: handleCheckDomain_1.TOOL_DEFINITION,
                handler: withContext(handleCheckDomain_1.handleCheckDomain),
            },
            {
                toolDefinition: handleCheckFunctionGroup_1.TOOL_DEFINITION,
                handler: withContext(handleCheckFunctionGroup_1.handleCheckFunctionGroup),
            },
            {
                toolDefinition: handleCheckFunctionModule_1.TOOL_DEFINITION,
                handler: withContext(handleCheckFunctionModule_1.handleCheckFunctionModule),
            },
            {
                toolDefinition: handleCheckInterface_1.TOOL_DEFINITION,
                handler: withContext(handleCheckInterface_1.handleCheckInterface),
            },
            {
                toolDefinition: handleCheckMetadataExtension_1.TOOL_DEFINITION,
                handler: withContext(handleCheckMetadataExtension_1.handleCheckMetadataExtension),
            },
            {
                toolDefinition: handleCheckPackage_1.TOOL_DEFINITION,
                handler: withContext(handleCheckPackage_1.handleCheckPackage),
            },
            {
                toolDefinition: handleCheckProgram_1.TOOL_DEFINITION,
                handler: withContext(handleCheckProgram_1.handleCheckProgram),
            },
            {
                toolDefinition: handleCheckStructure_1.TOOL_DEFINITION,
                handler: withContext(handleCheckStructure_1.handleCheckStructure),
            },
            {
                toolDefinition: handleCheckTable_1.TOOL_DEFINITION,
                handler: withContext(handleCheckTable_1.handleCheckTable),
            },
            {
                toolDefinition: handleCheckView_1.TOOL_DEFINITION,
                handler: withContext(handleCheckView_1.handleCheckView),
            },
            // Table type (TTYP) — the Create*/Delete* families had no TTYP entry at
            // all, so nested line-item structures could not be built.
            {
                toolDefinition: handleAddMessage_1.TOOL_DEFINITION,
                handler: withContext(handleAddMessage_1.handleAddMessage),
            },
            {
                toolDefinition: handleUpdateMessage_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateMessage_1.handleUpdateMessage),
            },
            {
                toolDefinition: handleCreateTableIndex_1.TOOL_DEFINITION,
                handler: withContext(handleCreateTableIndex_1.handleCreateTableIndex),
            },
            {
                toolDefinition: handleUpdateTableIndex_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateTableIndex_1.handleUpdateTableIndex),
            },
            {
                toolDefinition: handleDeleteTableIndex_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteTableIndex_1.handleDeleteTableIndex),
            },
            {
                toolDefinition: handleSetTableTechnicalSettings_1.TOOL_DEFINITION,
                handler: withContext(handleSetTableTechnicalSettings_1.handleSetTableTechnicalSettings),
            },
            {
                toolDefinition: handleCreateTableType_1.TOOL_DEFINITION,
                handler: withContext(handleCreateTableType_1.handleCreateTableType),
            },
            {
                toolDefinition: handleDeleteTableType_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteTableType_1.handleDeleteTableType),
            },
            // Transformation (XSLT) — no adt-clients wrapper; direct ADT ops
            {
                toolDefinition: handleCreateXslt_1.TOOL_DEFINITION,
                handler: withContext(handleCreateXslt_1.handleCreateXslt),
            },
            {
                toolDefinition: handleUpdateXslt_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateXslt_1.handleUpdateXslt),
            },
            {
                toolDefinition: handleDeleteXslt_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteXslt_1.handleDeleteXslt),
            },
            {
                toolDefinition: handleActivateXslt_1.TOOL_DEFINITION,
                handler: withContext(handleActivateXslt_1.handleActivateXslt),
            },
            // Message class (MSAG)
            {
                toolDefinition: handleCreateMessageClass_1.TOOL_DEFINITION,
                handler: withContext(handleCreateMessageClass_1.handleCreateMessageClass),
            },
            {
                toolDefinition: handleUpdateMessageClass_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateMessageClass_1.handleUpdateMessageClass),
            },
            {
                toolDefinition: handleDeleteMessageClass_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteMessageClass_1.handleDeleteMessageClass),
            },
            // Lock object (ENQU)
            {
                toolDefinition: handleCreateLockObject_1.TOOL_DEFINITION,
                handler: withContext(handleCreateLockObject_1.handleCreateLockObject),
            },
            {
                toolDefinition: handleUpdateLockObject_1.TOOL_DEFINITION,
                handler: withContext(handleUpdateLockObject_1.handleUpdateLockObject),
            },
            {
                toolDefinition: handleDeleteLockObject_1.TOOL_DEFINITION,
                handler: withContext(handleDeleteLockObject_1.handleDeleteLockObject),
            },
            {
                toolDefinition: handleActivateLockObject_1.TOOL_DEFINITION,
                handler: withContext(handleActivateLockObject_1.handleActivateLockObject),
            },
        ];
    }
}
exports.HighLevelHandlersGroup = HighLevelHandlersGroup;
//# sourceMappingURL=HighLevelHandlersGroup.js.map