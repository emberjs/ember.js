export enum Opcodes {
  // Statements
  Text,
  Append,
  UnoptimizedAppend,
  OptimizedAppend,
  Comment,
  Modifier,
  Block,
  ScannedBlock,
  NestedBlock,
  Component,
  ScannedComponent,
  OpenElement,
  OpenPrimitiveElement,
  FlushElement,
  CloseElement,
  StaticAttr,
  DynamicAttr,
  AnyDynamicAttr,
  Yield,
  Partial,
  StaticPartial,
  DynamicPartial,

  DynamicArg,
  StaticArg,
  TrustingAttr,
  Debugger,

  // Expressions

  Unknown,
  Arg,
  Get,
  HasBlock,
  HasBlockParams,
  Undefined,
  Function,
  Helper,
  Concat
}
