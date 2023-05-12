import type { Expression, Expressions, Statement, Statements } from '@glimmer/interfaces';

import { opcodes } from './lib/opcodes';

export { opcodes as SexpOpcodes } from './lib/opcodes';
export { resolution as VariableResolutionContext } from './lib/resolution';
export { WellKnownAttrNames, WellKnownTagNames } from './lib/well-known';

export function is<T>(variant: number): (value: any) => value is T {
  return function (value: any): value is T {
    return Array.isArray(value) && value[0] === variant;
  };
}

// Statements
export const isFlushElement = is<Statements.FlushElement>(opcodes.FlushElement);

export function isAttribute(val: Statement): val is Statements.Attribute {
  return (
    val[0] === opcodes.StaticAttr ||
    val[0] === opcodes.DynamicAttr ||
    val[0] === opcodes.TrustingDynamicAttr ||
    val[0] === opcodes.ComponentAttr ||
    val[0] === opcodes.StaticComponentAttr ||
    val[0] === opcodes.TrustingComponentAttr ||
    val[0] === opcodes.AttrSplat ||
    val[0] === opcodes.Modifier
  );
}

export function isStringLiteral(expr: Expression): expr is Expressions.StringValue {
  return typeof expr === 'string';
}

export function getStringFromValue(expr: Expressions.StringValue): string {
  return expr;
}

export function isArgument(val: Statement): val is Statements.Argument {
  return val[0] === opcodes.StaticArg || val[0] === opcodes.DynamicArg;
}

export function isHelper(expr: Expression): expr is Expressions.Helper {
  return Array.isArray(expr) && expr[0] === opcodes.Call;
}

// Expressions
export const isGet = is<Expressions.GetSymbol>(opcodes.GetSymbol);
