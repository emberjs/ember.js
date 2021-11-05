import { PresentArray } from '../array';
import { Dict, Option } from '../core';
import { CurriedType } from '../curry';

export type TupleSyntax = Statement | TupleExpression;

type JsonValue = string | number | boolean | JsonObject | JsonArray;

interface JsonObject extends Dict<JsonValue> {}
interface JsonArray extends Array<JsonValue> {}

export type TemplateReference = Option<SerializedBlock>;
export type YieldTo = number;

/**
 * A VariableResolutionContext explains how a variable name should be resolved.
 */
export const enum VariableResolutionContext {
  Strict = 0,
  AmbiguousAppend = 1,
  AmbiguousAppendInvoke = 2,
  AmbiguousInvoke = 3,
  ResolveAsCallHead = 5,
  ResolveAsModifierHead = 6,
  ResolveAsComponentHead = 7,
}

export const enum SexpOpcodes {
  // Statements
  Append = 1,
  TrustingAppend = 2,
  Comment = 3,
  Modifier = 4,
  StrictModifier = 5,
  Block = 6,
  StrictBlock = 7,
  Component = 8,

  OpenElement = 10,
  OpenElementWithSplat = 11,
  FlushElement = 12,
  CloseElement = 13,
  StaticAttr = 14,
  DynamicAttr = 15,
  ComponentAttr = 16,

  AttrSplat = 17,
  Yield = 18,

  DynamicArg = 20,
  StaticArg = 21,
  TrustingDynamicAttr = 22,
  TrustingComponentAttr = 23,
  StaticComponentAttr = 24,

  Debugger = 26,

  // Expressions
  Undefined = 27,
  Call = 28,
  Concat = 29,

  // Get
  // Get a local value via symbol
  GetSymbol = 30, // GetPath + 0-2,
  // Template symbol are values that are in scope in the template in strict mode
  GetTemplateSymbol = 32,
  // Free variables are only keywords in strict mode
  GetStrictFree = 31,

  // `{{x}}` in append position (might be a helper or component invocation, otherwise fall back to `this`)
  GetFreeAsComponentOrHelperHeadOrThisFallback = 34,
  // a component or helper (`{{<expr> x}}` in append position)
  GetFreeAsComponentOrHelperHead = 35,
  // a helper or `this` fallback `attr={{x}}`
  GetFreeAsHelperHeadOrThisFallback = 36,
  // a helper or `this` fallback (deprecated) `@arg={{x}}`
  GetFreeAsDeprecatedHelperHeadOrThisFallback = 99,
  // a call head `(x)`
  GetFreeAsHelperHead = 37,
  GetFreeAsModifierHead = 38,
  GetFreeAsComponentHead = 39,

  // Keyword Statements
  InElement = 40,
  If = 41,
  Each = 42,
  With = 43,
  Let = 44,
  WithDynamicVars = 45,
  InvokeComponent = 46,

  // Keyword Expressions
  HasBlock = 48,
  HasBlockParams = 49,
  Curry = 50,
  Not = 51,
  IfInline = 52,
  GetDynamicVar = 53,
  Log = 54,

  GetStart = GetSymbol,
  GetEnd = GetFreeAsComponentHead,
  GetLooseFreeStart = GetFreeAsComponentOrHelperHeadOrThisFallback,
  GetLooseFreeEnd = GetFreeAsComponentHead,
  GetContextualFreeStart = GetFreeAsComponentOrHelperHeadOrThisFallback,
}

export type GetContextualFreeOp =
  | SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback
  | SexpOpcodes.GetFreeAsComponentOrHelperHead
  | SexpOpcodes.GetFreeAsHelperHeadOrThisFallback
  | SexpOpcodes.GetFreeAsHelperHead
  | SexpOpcodes.GetFreeAsModifierHead
  | SexpOpcodes.GetFreeAsComponentHead
  | SexpOpcodes.GetStrictFree;

export type AttrOp =
  | SexpOpcodes.StaticAttr
  | SexpOpcodes.StaticComponentAttr
  | SexpOpcodes.DynamicAttr
  | SexpOpcodes.TrustingDynamicAttr
  | SexpOpcodes.ComponentAttr
  | SexpOpcodes.TrustingComponentAttr;

export type StatementSexpOpcode = Statement[0];
export type StatementSexpOpcodeMap = {
  [TSexpOpcode in Statement[0]]: Extract<Statement, { 0: TSexpOpcode }>;
};
export type ExpressionSexpOpcode = TupleExpression[0];
export type ExpressionSexpOpcodeMap = {
  [TSexpOpcode in TupleExpression[0]]: Extract<TupleExpression, { 0: TSexpOpcode }>;
};

export interface SexpOpcodeMap extends ExpressionSexpOpcodeMap, StatementSexpOpcodeMap {}
export type SexpOpcode = keyof SexpOpcodeMap;

export namespace Core {
  export type Expression = Expressions.Expression;

  export type CallArgs = [Params, Hash];
  export type Path = [string, ...string[]];
  export type ConcatParams = PresentArray<Expression>;
  export type Params = Option<ConcatParams>;
  export type Hash = Option<[PresentArray<string>, PresentArray<Expression>]>;
  export type Blocks = Option<[string[], SerializedInlineBlock[]]>;
  export type Args = [Params, Hash];
  export type NamedBlock = [string, SerializedInlineBlock];
  export type EvalInfo = number[];
  export type ElementParameters = Option<PresentArray<ElementParameter>>;

  export type Syntax = Path | Params | ConcatParams | Hash | Blocks | Args | EvalInfo;
}

export type CoreSyntax = Core.Syntax;

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type GetSymbol = [SexpOpcodes.GetSymbol, number];
  export type GetTemplateSymbol = [SexpOpcodes.GetTemplateSymbol, number];
  export type GetStrictFree = [SexpOpcodes.GetStrictFree, number];
  export type GetFreeAsComponentOrHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback,
    number
  ];
  export type GetFreeAsComponentOrHelperHead = [SexpOpcodes.GetFreeAsComponentOrHelperHead, number];
  export type GetFreeAsHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsHelperHeadOrThisFallback,
    number
  ];
  export type GetFreeAsDeprecatedHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback,
    number
  ];
  export type GetFreeAsHelperHead = [SexpOpcodes.GetFreeAsHelperHead, number];
  export type GetFreeAsModifierHead = [SexpOpcodes.GetFreeAsModifierHead, number];
  export type GetFreeAsComponentHead = [SexpOpcodes.GetFreeAsComponentHead, number];

  export type GetContextualFree =
    | GetFreeAsComponentOrHelperHeadOrThisFallback
    | GetFreeAsComponentOrHelperHead
    | GetFreeAsHelperHeadOrThisFallback
    | GetFreeAsDeprecatedHelperHeadOrThisFallback
    | GetFreeAsHelperHead
    | GetFreeAsModifierHead
    | GetFreeAsComponentHead;
  export type GetFree = GetStrictFree | GetContextualFree;
  export type GetVar = GetSymbol | GetTemplateSymbol | GetFree;

  export type GetPathSymbol = [SexpOpcodes.GetSymbol, number, Path];
  export type GetPathTemplateSymbol = [SexpOpcodes.GetTemplateSymbol, number, Path];
  export type GetPathStrictFree = [SexpOpcodes.GetStrictFree, number, Path];
  export type GetPathFreeAsComponentOrHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback,
    number,
    Path
  ];
  export type GetPathFreeAsComponentOrHelperHead = [
    SexpOpcodes.GetFreeAsComponentOrHelperHead,
    number,
    Path
  ];
  export type GetPathFreeAsHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsHelperHeadOrThisFallback,
    number,
    Path
  ];
  export type GetPathFreeAsDeprecatedHelperHeadOrThisFallback = [
    SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback,
    number,
    Path
  ];
  export type GetPathFreeAsHelperHead = [SexpOpcodes.GetFreeAsHelperHead, number, Path];
  export type GetPathFreeAsModifierHead = [SexpOpcodes.GetFreeAsModifierHead, number, Path];
  export type GetPathFreeAsComponentHead = [SexpOpcodes.GetFreeAsComponentHead, number, Path];

  export type GetPathContextualFree =
    | GetPathFreeAsComponentOrHelperHeadOrThisFallback
    | GetPathFreeAsComponentOrHelperHead
    | GetPathFreeAsHelperHeadOrThisFallback
    | GetPathFreeAsDeprecatedHelperHeadOrThisFallback
    | GetPathFreeAsHelperHead
    | GetPathFreeAsModifierHead
    | GetPathFreeAsComponentHead;
  export type GetPathFree = GetPathStrictFree | GetPathContextualFree;
  export type GetPath = GetPathSymbol | GetPathTemplateSymbol | GetPathFree;

  export type Get = GetVar | GetPath;

  export type StringValue = string;
  export type NumberValue = number;
  export type BooleanValue = boolean;
  export type NullValue = null;
  export type Value = StringValue | NumberValue | BooleanValue | NullValue;
  export type Undefined = [SexpOpcodes.Undefined];

  export type TupleExpression =
    | Get
    | GetDynamicVar
    | Concat
    | HasBlock
    | HasBlockParams
    | Curry
    | Helper
    | Undefined
    | IfInline
    | Not
    | Log;

  // TODO get rid of undefined, which is just here to allow trailing undefined in attrs
  // it would be better to handle that as an over-the-wire encoding concern
  export type Expression = TupleExpression | Value | undefined;

  export type Concat = [SexpOpcodes.Concat, Core.ConcatParams];
  export type Helper = [SexpOpcodes.Call, Expression, Option<Params>, Hash];
  export type HasBlock = [SexpOpcodes.HasBlock, Expression];
  export type HasBlockParams = [SexpOpcodes.HasBlockParams, Expression];
  export type Curry = [SexpOpcodes.Curry, Expression, CurriedType, Params, Hash];

  export type IfInline = [
    op: SexpOpcodes.IfInline,
    condition: Expression,
    truthyValue: Expression,
    falsyValue?: Option<Expression>
  ];

  export type Not = [op: SexpOpcodes.Not, value: Expression];

  export type GetDynamicVar = [op: SexpOpcodes.GetDynamicVar, value: Expression];

  export type Log = [op: SexpOpcodes.Log, positional: Params];
}

export type Expression = Expressions.Expression;
export type Get = Expressions.GetVar;

export type TupleExpression = Expressions.TupleExpression;

export const enum WellKnownAttrName {
  class = 0,
  id = 1,
  value = 2,
  name = 3,
  type = 4,
  style = 5,
  href = 6,
}

export const enum WellKnownTagName {
  div = 0,
  span = 1,
  p = 2,
  a = 3,
}

export namespace Statements {
  export type Expression = Expressions.Expression | undefined;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Blocks = Core.Blocks;
  export type Path = Core.Path;

  export type Append = [SexpOpcodes.Append, Expression];
  export type TrustingAppend = [SexpOpcodes.TrustingAppend, Expression];
  export type Comment = [SexpOpcodes.Comment, string];
  export type Modifier = [SexpOpcodes.Modifier, Expression, Params, Hash];
  export type Block = [SexpOpcodes.Block, Expression, Params, Hash, Blocks];
  export type Component = [
    op: SexpOpcodes.Component,
    tag: Expression,
    parameters: Core.ElementParameters,
    args: Hash,
    blocks: Blocks
  ];
  export type OpenElement = [SexpOpcodes.OpenElement, string | WellKnownTagName];
  export type OpenElementWithSplat = [SexpOpcodes.OpenElementWithSplat, string | WellKnownTagName];
  export type FlushElement = [SexpOpcodes.FlushElement];
  export type CloseElement = [SexpOpcodes.CloseElement];
  export type StaticAttr = [
    SexpOpcodes.StaticAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];
  export type StaticComponentAttr = [
    SexpOpcodes.StaticComponentAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];

  export type AnyStaticAttr = StaticAttr | StaticComponentAttr;

  export type AttrSplat = [SexpOpcodes.AttrSplat, YieldTo];
  export type Yield = [SexpOpcodes.Yield, YieldTo, Option<Params>];
  export type DynamicArg = [SexpOpcodes.DynamicArg, string, Expression];
  export type StaticArg = [SexpOpcodes.StaticArg, string, Expression];

  export type DynamicAttr = [
    SexpOpcodes.DynamicAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];
  export type ComponentAttr = [
    SexpOpcodes.ComponentAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];
  export type TrustingDynamicAttr = [
    SexpOpcodes.TrustingDynamicAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];
  export type TrustingComponentAttr = [
    SexpOpcodes.TrustingComponentAttr,
    string | WellKnownAttrName,
    Expression,
    string?
  ];

  export type AnyDynamicAttr =
    | DynamicAttr
    | ComponentAttr
    | TrustingDynamicAttr
    | TrustingComponentAttr;

  export type Debugger = [SexpOpcodes.Debugger, Core.EvalInfo];
  export type InElement = [
    op: SexpOpcodes.InElement,
    block: SerializedInlineBlock,
    guid: string,
    destination: Expression,
    insertBefore?: Expression
  ];

  export type If = [
    op: SexpOpcodes.If,
    condition: Expression,
    block: SerializedInlineBlock,
    inverse: Option<SerializedInlineBlock>
  ];

  export type Each = [
    op: SexpOpcodes.Each,
    condition: Expression,
    key: Option<Expression>,
    block: SerializedInlineBlock,
    inverse: Option<SerializedInlineBlock>
  ];

  export type With = [
    op: SexpOpcodes.With,
    value: Expression,
    block: SerializedInlineBlock,
    inverse: Option<SerializedInlineBlock>
  ];

  export type Let = [op: SexpOpcodes.Let, positional: Core.Params, block: SerializedInlineBlock];

  export type WithDynamicVars = [
    op: SexpOpcodes.WithDynamicVars,
    args: Core.Hash,
    block: SerializedInlineBlock
  ];

  export type InvokeComponent = [
    op: SexpOpcodes.InvokeComponent,
    definition: Expression,
    positional: Core.Params,
    named: Core.Hash,
    blocks: Blocks | null
  ];

  /**
   * A Handlebars statement
   */
  export type Statement =
    | Append
    | TrustingAppend
    | Comment
    | Modifier
    | Block
    | Component
    | OpenElement
    | OpenElementWithSplat
    | FlushElement
    | CloseElement
    | Attribute
    | AttrSplat
    | Yield
    | StaticArg
    | DynamicArg
    | Debugger
    | InElement
    | If
    | Each
    | With
    | Let
    | WithDynamicVars
    | InvokeComponent;

  export type Attribute =
    | StaticAttr
    | StaticComponentAttr
    | DynamicAttr
    | TrustingDynamicAttr
    | ComponentAttr
    | TrustingComponentAttr;

  export type ComponentFeature = Modifier | AttrSplat;
  export type Argument = StaticArg | DynamicArg;

  export type ElementParameter = Attribute | Argument | ComponentFeature;
}

/** A Handlebars statement */
export type Statement = Statements.Statement;
export type Attribute = Statements.Attribute;
export type Argument = Statements.Argument;
export type ElementParameter = Statements.ElementParameter;

export type SexpSyntax = Statement | TupleExpression;
// TODO this undefined is related to the other TODO in this file
export type Syntax = SexpSyntax | Expressions.Value | undefined;

export type SyntaxWithInternal =
  | Syntax
  | CoreSyntax
  | SerializedTemplateBlock
  | Core.CallArgs
  | Core.NamedBlock
  | Core.ElementParameters;

/**
 * A JSON object that the Block was serialized into.
 */
export type SerializedBlock = [statements: Statements.Statement[]];

export type SerializedInlineBlock = [statements: Statements.Statement[], parameters: number[]];

/**
 * A JSON object that the compiled TemplateBlock was serialized into.
 */
export type SerializedTemplateBlock = [
  // statements
  Statements.Statement[],
  // symbols
  string[],
  // hasEval
  boolean,
  // upvars
  string[]
];

/**
 * A JSON object that the compiled Template was serialized into.
 */
export interface SerializedTemplate {
  block: SerializedTemplateBlock;
  id?: Option<string>;
  moduleName: string;
}

/**
 * A string of JSON containing a SerializedTemplateBlock
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and TemplateMeta.
 */
export interface SerializedTemplateWithLazyBlock {
  id?: Option<string>;
  block: SerializedTemplateBlockJSON;
  moduleName: string;
  scope: (() => unknown[]) | undefined | null;
  isStrictMode: boolean;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;
