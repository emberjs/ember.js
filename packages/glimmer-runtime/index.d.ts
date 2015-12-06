export {
  StatementSyntax,
  ExpressionSyntax,
  AttributeSyntax,
  ATTRIBUTE_SYNTAX,
  default as Syntax
} from './lib/syntax';

export {
  default as Template,
  Templates,
  Append,
  Unknown,
  StaticAttr,
  DynamicAttr,
  AddClass,
  Args as ArgsSyntax,
  NamedArgs as NamedArgsSyntax,
  PositionalArgs as PositionalArgsSyntax,
  Get as GetSyntax,
  Value as ValueSyntax,
  OpenElement,
  Helper as HelperSyntax,
  Block as BlockSyntax,
} from './lib/template';

export {
  default as Compiler,
  RawTemplate
} from './lib/compiler';

export {
  OpSeq,
  OpSeqBuilder
} from './lib/opcodes';

export {
  PushChildScopeOpcode,
  PopScopeOpcode,
  PutArgsOpcode,
  BindArgsOpcode,
  NoopOpcode,
  EnterOpcode,
  ExitOpcode,
  EvaluateOpcode,
  TestOpcode,
  JumpOpcode,
  JumpIfOpcode,
  JumpUnlessOpcode,
} from './lib/compiled/opcodes/vm';

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
  ComponentInvocation,
  ComponentHooks,
  Component
} from './lib/component/interfaces';

export { default as DOMHelper, isWhitespace } from './lib/dom';
export { ElementStack } from './lib/builder';