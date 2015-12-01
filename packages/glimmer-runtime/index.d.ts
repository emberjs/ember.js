export {
  default as Template,
  ATTRIBUTE_SYNTAX,
  Templates,
  ParamsAndHash,
  Params,
  Hash,
  EvaluatedParams,
  EvaluatedHash,
  EvaluatedParamsAndHash,
  Append,
  Unknown,
  StaticAttr,
  DynamicAttr,
  AddClass,
  Get as GetSyntax,
  Value as ValueSyntax,
  AttributeSyntax,
  OpenElement,
  Helper as HelperSyntax,
  Block as BlockSyntax,
  Jump,
  JumpIf,
  JumpUnless,
  builders
} from './lib/template';

export {
  StatementSyntax,
  ExpressionSyntax,
  OpSeq,
  OpSeqBuilder
} from './lib/opcodes';

export {
  PushChildScopeOpcode,
  PopScopeOpcode,
  ArgsOpcode,
  NoopOpcode,
  EnterOpcode,
  ExitOpcode,
  EvaluateOpcode,
  TestOpcode,
  JumpOpcode,
  JumpIfOpcode,
  JumpUnlessOpcode,
} from './lib/opcodes/vm';

export {
  EnterListOpcode,
  ExitListOpcode,
  EnterWithKeyOpcode,
  NextIterOpcode
} from './lib/opcodes/lists';

export { VM, UpdatingVM, RenderResult } from './lib/vm';

export {
  PushScopeOptions,
  PushChildScope,
  PushRootScope,
  PopScope,
  Evaluate,
  Deref,
  DerefRegister,
  PutObject,
  GetObject,
  GetLocal,
  OpenBlock,
  CloseBlock,
  NoopSyntax,
  StartIter,
  NextIter
} from './lib/opcodes/inlining';

export {
  Scope,
  Environment,
  Helper,
  Frame,
  Block,
} from './lib/environment';

export {
  ComponentClass,
  ComponentDefinition,
  AppendingComponentClass,
  ComponentDefinitionOptions,
  AppendingComponent as IAppendingComponent,
  AppendingComponentOptions,
  ComponentHooks,
  Component
} from './lib/component/interfaces';

export {
  appendComponent
} from './lib/component/utils';

export { default as AppendingComponent } from './lib/component/appending';

export { default as DOMHelper, isWhitespace } from './lib/dom';
export { ElementStack } from './lib/builder';
export { Bounds } from './lib/morph';