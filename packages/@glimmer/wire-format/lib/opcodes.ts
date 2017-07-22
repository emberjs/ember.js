export enum Opcodes {
  // Statements
  Text,
  Append,
  Comment,
  Modifier,
  Block,
  Component,
  OpenElement,
  OpenSplattedElement,
  FlushElement,
  CloseElement,
  StaticAttr,
  DynamicAttr,
  AttrSplat,
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
  MaybeLocal,
  FixThisBeforeWeMerge,
  HasBlock,
  HasBlockParams,
  Undefined,
  Helper,
  Concat,
  ClientSideExpression
}
