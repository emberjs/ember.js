export {
  ATTRIBUTE as ATTRIBUTE_SYNTAX,
  Statement as StatementSyntax,
  Expression as ExpressionSyntax,
  Attribute as AttributeSyntax,
  StatementCompilationBuffer,
  SymbolLookup,
  CompileInto,
  isAttribute
} from './lib/syntax';

export { default as Template } from './lib/template';

export { default as SymbolTable } from './lib/symbol-table';

export { ConditionalReference, NULL_REFERENCE, UNDEFINED_REFERENCE } from './lib/references';

export {
  Templates,
  Append,
  Unknown,
  StaticAttr,
  DynamicAttr,
  Args as ArgsSyntax,
  NamedArgs as NamedArgsSyntax,
  PositionalArgs as PositionalArgsSyntax,
  Ref as RefSyntax,
  GetArgument as GetNamedParameterSyntax,
  Get as GetSyntax,
  Value as ValueSyntax,
  OpenElement,
  Helper as HelperSyntax,
  Block as BlockSyntax,
  OpenPrimitiveElement as OpenPrimitiveElementSyntax,
  CloseElement as CloseElementSyntax
} from './lib/syntax/core';

export {
  default as Compiler,
  Compilable,
  CompileIntoList,
  compileLayout
} from './lib/compiler';

export {
  default as OpcodeBuilder,
  DynamicComponentOptions,
  StaticComponentOptions
} from './lib/opcode-builder';

export {
  Block,
  BlockOptions,
  CompiledBlock,
  Layout,
  LayoutOptions,
  InlineBlock,
  InlineBlockOptions,
  EntryPoint
} from './lib/compiled/blocks';

export {
  Opcode,
  OpSeq,
  OpSeqBuilder,
  inspect as inspectOpcodes
} from './lib/opcodes';

export {
  PushRootScopeOpcode,
  PushChildScopeOpcode,
  PopScopeOpcode,
  PushDynamicScopeOpcode,
  PopDynamicScopeOpcode,
  PutValueOpcode,
  PutNullOpcode,
  PutArgsOpcode,
  LabelOpcode,
  EnterOpcode,
  ExitOpcode,
  EvaluateOpcode,
  TestOpcode,
  JumpOpcode,
  JumpIfOpcode,
  JumpUnlessOpcode,
  BindNamedArgsOpcode,
  BindDynamicScopeOpcode
} from './lib/compiled/opcodes/vm';

export {
  OpenComponentOptions,
  OpenComponentOpcode,
  CloseComponentOpcode,
  ShadowAttributesOpcode
} from './lib/compiled/opcodes/component';

export {
  OpenPrimitiveElementOpcode,
  CloseElementOpcode
} from './lib/compiled/opcodes/dom';

export {
  IChangeList,
  AttributeChangeList,
  PropertyChangeList,
  SafeHrefAttributeChangeList,
  SafeHrefPropertyChangeList,
  InputValueAttributeChangeList,
  InputValuePropertyChangeList,
  defaultChangeLists,
  defaultAttributeChangeLists,
  defaultPropertyChangeLists,
  readDOMAttr
} from './lib/dom/change-lists';

export {
  normalizeTextValue
} from './lib/compiled/opcodes/content';

export {
  CompiledExpression
} from './lib/compiled/expressions';

export {
  CompiledArgs,
  CompiledNamedArgs,
  CompiledPositionalArgs,
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs
} from './lib/compiled/expressions/args';

export {
  ValueReference
} from './lib/compiled/expressions/value';

export {
  FunctionExpression
} from './lib/compiled/expressions/function';

export {
  EnterListOpcode,
  ExitListOpcode,
  EnterWithKeyOpcode,
  NextIterOpcode
} from './lib/compiled/opcodes/lists';

export { PublicVM as VM, UpdatingVM, RenderResult } from './lib/vm';

export { SafeString, isSafeString } from './lib/upsert';

export {
  Scope,
  default as Environment,
  Helper,
  ParsedStatement,
  DynamicScope,
} from './lib/environment';

export {
  PartialDefinition
} from './lib/partial';

export {
  Component,
  ComponentClass,
  ComponentManager,
  ComponentDefinition,
  ComponentLayoutBuilder,
  ComponentAttrsBuilder
} from './lib/component/interfaces';

export {
  ModifierManager
} from './lib/modifier/interfaces';

export { default as DOMHelper, DOMHelper as IDOMHelper, isWhitespace } from './lib/dom/helper';
export { ElementStack, ElementOperations } from './lib/builder';
