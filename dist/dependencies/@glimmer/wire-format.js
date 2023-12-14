const opcodes = {
  Append: 1,
  TrustingAppend: 2,
  Comment: 3,
  Modifier: 4,
  StrictModifier: 5,
  Block: 6,
  StrictBlock: 7,
  Component: 8,
  OpenElement: 10,
  OpenElementWithSplat: 11,
  FlushElement: 12,
  CloseElement: 13,
  StaticAttr: 14,
  DynamicAttr: 15,
  ComponentAttr: 16,
  AttrSplat: 17,
  Yield: 18,
  DynamicArg: 20,
  StaticArg: 21,
  TrustingDynamicAttr: 22,
  TrustingComponentAttr: 23,
  StaticComponentAttr: 24,
  Debugger: 26,
  Undefined: 27,
  Call: 28,
  Concat: 29,
  GetSymbol: 30,
  GetLexicalSymbol: 32,
  GetStrictKeyword: 31,
  GetFreeAsComponentOrHelperHeadOrThisFallback: 34,
  GetFreeAsComponentOrHelperHead: 35,
  GetFreeAsHelperHeadOrThisFallback: 36,
  GetFreeAsDeprecatedHelperHeadOrThisFallback: 99,
  GetFreeAsHelperHead: 37,
  GetFreeAsModifierHead: 38,
  GetFreeAsComponentHead: 39,
  InElement: 40,
  If: 41,
  Each: 42,
  With: 43,
  Let: 44,
  WithDynamicVars: 45,
  InvokeComponent: 46,
  HasBlock: 48,
  HasBlockParams: 49,
  Curry: 50,
  Not: 51,
  IfInline: 52,
  GetDynamicVar: 53,
  Log: 54
};

// eslint-disable-next-line @typescript-eslint/naming-convention

const resolution = {
  Strict: 0,
  AmbiguousAppend: 1,
  AmbiguousAppendInvoke: 2,
  AmbiguousInvoke: 3,
  ResolveAsCallHead: 5,
  ResolveAsModifierHead: 6,
  ResolveAsComponentHead: 7
};

const WellKnownAttrNames = {
  class: 0,
  id: 1,
  value: 2,
  name: 3,
  type: 4,
  style: 5,
  href: 6
};
const WellKnownTagNames = {
  div: 0,
  span: 1,
  p: 2,
  a: 3
};

function is(variant) {
  return function (value) {
    return Array.isArray(value) && value[0] === variant;
  };
}

// Statements
const isFlushElement = is(opcodes.FlushElement);
function isAttribute(val) {
  return val[0] === opcodes.StaticAttr || val[0] === opcodes.DynamicAttr || val[0] === opcodes.TrustingDynamicAttr || val[0] === opcodes.ComponentAttr || val[0] === opcodes.StaticComponentAttr || val[0] === opcodes.TrustingComponentAttr || val[0] === opcodes.AttrSplat || val[0] === opcodes.Modifier;
}
function isStringLiteral(expr) {
  return typeof expr === 'string';
}
function getStringFromValue(expr) {
  return expr;
}
function isArgument(val) {
  return val[0] === opcodes.StaticArg || val[0] === opcodes.DynamicArg;
}
function isHelper(expr) {
  return Array.isArray(expr) && expr[0] === opcodes.Call;
}

// Expressions
const isGet = is(opcodes.GetSymbol);

export { opcodes as SexpOpcodes, resolution as VariableResolutionContext, WellKnownAttrNames, WellKnownTagNames, getStringFromValue, is, isArgument, isAttribute, isFlushElement, isGet, isHelper, isStringLiteral };
