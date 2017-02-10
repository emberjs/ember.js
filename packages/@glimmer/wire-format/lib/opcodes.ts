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
  Arg,
  Get,
  HasBlock,
  HasBlockParams,
  Undefined,
  Helper,
  Concat,
  ClientSideExpression
}
