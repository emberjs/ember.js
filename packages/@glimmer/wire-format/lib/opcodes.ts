export enum Opcodes {
  // Statements
  Text,
  Append,
  Comment,
  Modifier,
  Block,
  Component,
  DynamicComponent,
  OpenElement,
  OpenSplattedElement,
  FlushElement,
  CloseElement,
  StaticAttr,
  DynamicAttr,
  ComponentAttr,
  AttrSplat,
  Yield,
  Partial,

  DynamicArg,
  StaticArg,
  TrustingAttr,
  TrustingComponentAttr,
  Debugger,
  ClientSideStatement,

  // Expressions

  Unknown,
  Get,
  MaybeLocal,
  HasBlock,
  HasBlockParams,
  Undefined,
  Helper,
  Concat,
}
