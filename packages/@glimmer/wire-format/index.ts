import { Statements, Statement, SexpOpcodes, Expressions, Expression } from '@glimmer/interfaces';

export function is<T>(variant: number): (value: any) => value is T {
  return function(value: any): value is T {
    return Array.isArray(value) && value[0] === variant;
  };
}

// Statements
export const isFlushElement = is<Statements.FlushElement>(SexpOpcodes.FlushElement);
export const isAttrSplat = is<Statements.AttrSplat>(SexpOpcodes.AttrSplat);

export function isAttribute(val: Statement): val is Statements.Attribute {
  return (
    val[0] === SexpOpcodes.StaticAttr ||
    val[0] === SexpOpcodes.DynamicAttr ||
    val[0] === SexpOpcodes.TrustingDynamicAttr ||
    val[0] === SexpOpcodes.ComponentAttr
  );
}

export function isArgument(val: Statement): val is Statements.Argument {
  return val[0] === SexpOpcodes.StaticArg || val[0] === SexpOpcodes.DynamicArg;
}

export function isHelper(expr: Expression): expr is Expressions.Helper {
  return Array.isArray(expr) && expr[0] === SexpOpcodes.Helper;
}

// Expressions
export const isGet = is<Expressions.Get>(SexpOpcodes.Get);
export const isMaybeLocal = is<Expressions.MaybeLocal>(SexpOpcodes.MaybeLocal);
