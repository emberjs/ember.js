export {
  StatementSyntax,
  ExpressionSyntax,
  AttributeSyntax,
  CompileInto,
  ATTRIBUTE_SYNTAX,
  default as Syntax
} from './lib/syntax';

export { default as Template } from './lib/template';

export { default as SymbolTable } from './lib/symbol-table';

export {
  Templates,
  Append,
  Unknown,
  StaticAttr,
  DynamicAttr,
  DynamicProp,
  AddClass,
  Args as ArgsSyntax,
  NamedArgs as NamedArgsSyntax,
  PositionalArgs as PositionalArgsSyntax,
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
  RawTemplate,
  RawTemplateOptions,
  RawLayout,
  RawLayoutOptions,
  RawBlock,
  RawBlockOptions,
  CompileIntoList
} from './lib/compiler';

export {
  OpSeq,
  OpSeqBuilder
} from './lib/opcodes';

export {
  PushChildScopeOpcode,
  PopScopeOpcode,
  PutArgsOpcode,
  NoopOpcode,
  EnterOpcode,
  ExitOpcode,
  EvaluateOpcode,
  TestOpcode,
  JumpOpcode,
  JumpIfOpcode,
  JumpUnlessOpcode,
  BindNamedArgsOpcode
} from './lib/compiled/opcodes/vm';

export {
  OpenComponentOpcode,
  CloseComponentOpcode,
  ShadowAttributesOpcode
} from './lib/compiled/opcodes/component';

export {
  CloseElementOpcode
} from './lib/compiled/opcodes/dom';

export {
  CompiledArgs,
  CompiledNamedArgs,
  CompiledPositionalArgs,
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs
} from './lib/compiled/expressions/args';

export {
  EnterListOpcode,
  ExitListOpcode,
  EnterWithKeyOpcode,
  NextIterOpcode
} from './lib/compiled/opcodes/lists';

export { VM, UpdatingVM, RenderResult } from './lib/vm';

export {
  Scope,
  default as Environment,
  Helper,
} from './lib/environment';

export {
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  ComponentHooks,
  CompileComponentOptions,
  Component
} from './lib/component/interfaces';

export { default as DOMHelper, isWhitespace } from './lib/dom';
export { ElementStack } from './lib/builder';