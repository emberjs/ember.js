export enum Opcodes {
  // Statements
  Text,
  Append,
  Comment,
  Modifier,
  Block,
  Component,
  OpenElement,
  FlushElement,
  CloseElement,
  StaticAttr,
  DynamicAttr,
  Yield,
  Partial,

  DynamicArg,
  StaticArg,
  TrustingAttr,
  Debugger,
  ClientSideStatement,

  // Expressions

  Unknown,
  Get,
  Doubtful,
  FixThisBeforeWeMerge,
  HasBlock,
  HasBlockParams,
  Undefined,
  Helper,
  Concat,
  ClientSideExpression
}
