import type {
  VmAppendDocumentFragment,
  VmAppendHTML,
  VmAppendNode,
  VmAppendSafeHTML,
  VmAppendText,
  VmAssertSame,
  VmBeginComponentTransaction,
  VmBindDebuggerScope,
  VmBindDynamicScope,
  VmCaptureArgs,
  VmChildScope,
  VmCloseElement,
  VmComment,
  VmCommitComponentTransaction,
  VmCompileBlock,
  VmComponentAttr,
  VmConcat,
  VmConstant,
  VmConstantReference,
  VmContentType,
  VmCreateComponent,
  VmCurry,
  VmDebugger,
  VmDidCreateElement,
  VmDidRenderLayout,
  VmDup,
  VmDynamicAttr,
  VmDynamicContentType,
  VmDynamicHelper,
  VmDynamicModifier,
  VmEnter,
  VmEnterList,
  VmExit,
  VmExitList,
  VmFetch,
  VmFlushElement,
  VmGetBlock,
  VmGetComponentLayout,
  VmGetComponentSelf,
  VmGetComponentTagName,
  VmGetDynamicVar,
  VmGetProperty,
  VmGetVariable,
  VmHasBlock,
  VmHasBlockParams,
  VmHelper,
  VmIfInline,
  VmInvokeComponentLayout,
  VmInvokeYield,
  VmIterate,
  VmJumpEq,
  VmJumpIf,
  VmJumpUnless,
  VmLoad,
  VmLog,
  VmMain,
  VmModifier,
  VmNot,
  VmOp,
  VmOpenDynamicElement,
  VmOpenElement,
  VmPop,
  VmPopArgs,
  VmPopDynamicScope,
  VmPopRemoteElement,
  VmPopScope,
  VmPopulateLayout,
  VmPrepareArgs,
  VmPrimitive,
  VmPrimitiveReference,
  VmPushArgs,
  VmPushBlockScope,
  VmPushComponentDefinition,
  VmPushDynamicComponentInstance,
  VmPushDynamicScope,
  VmPushEmptyArgs,
  VmPushRemoteElement,
  VmPushSymbolTable,
  VmPutComponentOperations,
  VmRegisterComponentDestructor,
  VmReifyU32,
  VmResolveCurriedComponent,
  VmResolveDynamicComponent,
  VmRootScope,
  VmSetBlock,
  VmSetBlocks,
  VmSetNamedVariables,
  VmSetupForDebugger,
  VmSetVariable,
  VmSize,
  VmSpreadBlock,
  VmStaticAttr,
  VmStaticComponentAttr,
  VmText,
  VmToBoolean,
  VmVirtualRootScope,
} from '@glimmer/interfaces';

export const VM_HELPER_OP = 16 satisfies VmHelper;
export const VM_SET_NAMED_VARIABLES_OP = 17 satisfies VmSetNamedVariables;
export const VM_SET_BLOCKS_OP = 18 satisfies VmSetBlocks;
export const VM_SET_VARIABLE_OP = 19 satisfies VmSetVariable;
export const VM_SET_BLOCK_OP = 20 satisfies VmSetBlock;
export const VM_GET_VARIABLE_OP = 21 satisfies VmGetVariable;
export const VM_GET_PROPERTY_OP = 22 satisfies VmGetProperty;
export const VM_GET_BLOCK_OP = 23 satisfies VmGetBlock;
export const VM_SPREAD_BLOCK_OP = 24 satisfies VmSpreadBlock;
export const VM_HAS_BLOCK_OP = 25 satisfies VmHasBlock;
export const VM_HAS_BLOCK_PARAMS_OP = 26 satisfies VmHasBlockParams;
export const VM_CONCAT_OP = 27 satisfies VmConcat;
export const VM_CONSTANT_OP = 28 satisfies VmConstant;
export const VM_CONSTANT_REFERENCE_OP = 29 satisfies VmConstantReference;
export const VM_PRIMITIVE_OP = 30 satisfies VmPrimitive;
export const VM_PRIMITIVE_REFERENCE_OP = 31 satisfies VmPrimitiveReference;
export const VM_REIFY_U32_OP = 32 satisfies VmReifyU32;
export const VM_DUP_OP = 33 satisfies VmDup;
export const VM_POP_OP = 34 satisfies VmPop;
export const VM_LOAD_OP = 35 satisfies VmLoad;
export const VM_FETCH_OP = 36 satisfies VmFetch;
export const VM_ROOT_SCOPE_OP = 37 satisfies VmRootScope;
export const VM_VIRTUAL_ROOT_SCOPE_OP = 38 satisfies VmVirtualRootScope;
export const VM_CHILD_SCOPE_OP = 39 satisfies VmChildScope;
export const VM_POP_SCOPE_OP = 40 satisfies VmPopScope;
export const VM_TEXT_OP = 41 satisfies VmText;
export const VM_COMMENT_OP = 42 satisfies VmComment;
export const VM_APPEND_HTML_OP = 43 satisfies VmAppendHTML;
export const VM_APPEND_SAFE_HTML_OP = 44 satisfies VmAppendSafeHTML;
export const VM_APPEND_DOCUMENT_FRAGMENT_OP = 45 satisfies VmAppendDocumentFragment;
export const VM_APPEND_NODE_OP = 46 satisfies VmAppendNode;
export const VM_APPEND_TEXT_OP = 47 satisfies VmAppendText;
export const VM_OPEN_ELEMENT_OP = 48 satisfies VmOpenElement;
export const VM_OPEN_DYNAMIC_ELEMENT_OP = 49 satisfies VmOpenDynamicElement;
export const VM_PUSH_REMOTE_ELEMENT_OP = 50 satisfies VmPushRemoteElement;
export const VM_STATIC_ATTR_OP = 51 satisfies VmStaticAttr;
export const VM_DYNAMIC_ATTR_OP = 52 satisfies VmDynamicAttr;
export const VM_COMPONENT_ATTR_OP = 53 satisfies VmComponentAttr;
export const VM_FLUSH_ELEMENT_OP = 54 satisfies VmFlushElement;
export const VM_CLOSE_ELEMENT_OP = 55 satisfies VmCloseElement;
export const VM_POP_REMOTE_ELEMENT_OP = 56 satisfies VmPopRemoteElement;
export const VM_MODIFIER_OP = 57 satisfies VmModifier;
export const VM_BIND_DYNAMIC_SCOPE_OP = 58 satisfies VmBindDynamicScope;
export const VM_PUSH_DYNAMIC_SCOPE_OP = 59 satisfies VmPushDynamicScope;
export const VM_POP_DYNAMIC_SCOPE_OP = 60 satisfies VmPopDynamicScope;
export const VM_COMPILE_BLOCK_OP = 61 satisfies VmCompileBlock;
export const VM_PUSH_BLOCK_SCOPE_OP = 62 satisfies VmPushBlockScope;
export const VM_PUSH_SYMBOL_TABLE_OP = 63 satisfies VmPushSymbolTable;
export const VM_INVOKE_YIELD_OP = 64 satisfies VmInvokeYield;
export const VM_JUMP_IF_OP = 65 satisfies VmJumpIf;
export const VM_JUMP_UNLESS_OP = 66 satisfies VmJumpUnless;
export const VM_JUMP_EQ_OP = 67 satisfies VmJumpEq;
export const VM_ASSERT_SAME_OP = 68 satisfies VmAssertSame;
export const VM_ENTER_OP = 69 satisfies VmEnter;
export const VM_EXIT_OP = 70 satisfies VmExit;
export const VM_TO_BOOLEAN_OP = 71 satisfies VmToBoolean;
export const VM_ENTER_LIST_OP = 72 satisfies VmEnterList;
export const VM_EXIT_LIST_OP = 73 satisfies VmExitList;
export const VM_ITERATE_OP = 74 satisfies VmIterate;
export const VM_MAIN_OP = 75 satisfies VmMain;
export const VM_CONTENT_TYPE_OP = 76 satisfies VmContentType;
export const VM_CURRY_OP = 77 satisfies VmCurry;
export const VM_PUSH_COMPONENT_DEFINITION_OP = 78 satisfies VmPushComponentDefinition;
export const VM_PUSH_DYNAMIC_COMPONENT_INSTANCE_OP = 79 satisfies VmPushDynamicComponentInstance;
export const VM_RESOLVE_DYNAMIC_COMPONENT_OP = 80 satisfies VmResolveDynamicComponent;
export const VM_RESOLVE_CURRIED_COMPONENT_OP = 81 satisfies VmResolveCurriedComponent;
export const VM_PUSH_ARGS_OP = 82 satisfies VmPushArgs;
export const VM_PUSH_EMPTY_ARGS_OP = 83 satisfies VmPushEmptyArgs;
export const VM_POP_ARGS_OP = 84 satisfies VmPopArgs;
export const VM_PREPARE_ARGS_OP = 85 satisfies VmPrepareArgs;
export const VM_CAPTURE_ARGS_OP = 86 satisfies VmCaptureArgs;
export const VM_CREATE_COMPONENT_OP = 87 satisfies VmCreateComponent;
export const VM_REGISTER_COMPONENT_DESTRUCTOR_OP = 88 satisfies VmRegisterComponentDestructor;
export const VM_PUT_COMPONENT_OPERATIONS_OP = 89 satisfies VmPutComponentOperations;
export const VM_GET_COMPONENT_SELF_OP = 90 satisfies VmGetComponentSelf;
export const VM_GET_COMPONENT_TAG_NAME_OP = 91 satisfies VmGetComponentTagName;
export const VM_GET_COMPONENT_LAYOUT_OP = 92 satisfies VmGetComponentLayout;
export const VM_BIND_DEBUGGER_SCOPE_OP = 93 satisfies VmBindDebuggerScope;
export const VM_SETUP_FOR_DEBUGGER_OP = 94 satisfies VmSetupForDebugger;
export const VM_POPULATE_LAYOUT_OP = 95 satisfies VmPopulateLayout;
export const VM_INVOKE_COMPONENT_LAYOUT_OP = 96 satisfies VmInvokeComponentLayout;
export const VM_BEGIN_COMPONENT_TRANSACTION_OP = 97 satisfies VmBeginComponentTransaction;
export const VM_COMMIT_COMPONENT_TRANSACTION_OP = 98 satisfies VmCommitComponentTransaction;
export const VM_DID_CREATE_ELEMENT_OP = 99 satisfies VmDidCreateElement;
export const VM_DID_RENDER_LAYOUT_OP = 100 satisfies VmDidRenderLayout;
export const VM_DEBUGGER_OP = 103 satisfies VmDebugger;
export const VM_STATIC_COMPONENT_ATTR_OP = 105 satisfies VmStaticComponentAttr;
export const VM_DYNAMIC_CONTENT_TYPE_OP = 106 satisfies VmDynamicContentType;
export const VM_DYNAMIC_HELPER_OP = 107 satisfies VmDynamicHelper;
export const VM_DYNAMIC_MODIFIER_OP = 108 satisfies VmDynamicModifier;
export const VM_IF_INLINE_OP = 109 satisfies VmIfInline;
export const VM_NOT_OP = 110 satisfies VmNot;
export const VM_GET_DYNAMIC_VAR_OP = 111 satisfies VmGetDynamicVar;
export const VM_LOG_OP = 112 satisfies VmLog;
export const VM_SYSCALL_SIZE = 113 satisfies VmSize;

export function isOp(value: number): value is VmOp {
  return value >= 16;
}
