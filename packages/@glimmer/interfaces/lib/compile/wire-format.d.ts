import { Dict, Option } from '../core';

export type TupleSyntax = Statement | TupleExpression;

type JsonValue = string | number | boolean | JsonObject | JsonArray;

interface JsonObject extends Dict<JsonValue> {}
interface JsonArray extends Array<JsonValue> {}

export type TemplateReference = Option<SerializedBlock>;
export type YieldTo = number;

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
  Partial = 19,

  DynamicArg = 20,
  StaticArg = 21,
  TrustingDynamicAttr = 22,
  TrustingComponentAttr = 23,
  StaticComponentAttr = 24,

  Debugger = 26,

  // Expressions
  HasBlock = 27,
  HasBlockParams = 28,
  Undefined = 29,
  Call = 30,
  Concat = 31,

  // GetPath
  GetSymbol = 32, // GetPath + 0-2,
  GetFree = 33,
  GetFreeInAppendSingleId = 34, // GetContextualFree + 0-5
  GetFreeInExpression = 35,
  GetFreeInCallHead = 36,
  GetFreeInBlockHead = 37,
  GetFreeInModifierHead = 38,
  GetFreeInComponentHead = 39,

  GetPathStart = GetSymbol,
  GetContextualFreeStart = GetFreeInAppendSingleId,
}

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

  export type Path = string[];
  export type Params = Expression[];
  export type ConcatParams = [Expression, ...Expression[]];
  export type Hash = Option<[string[], Expression[]]>;
  export type Blocks = Option<[string[], SerializedInlineBlock[]]>;
  export type Args = [Params, Hash];
  export type EvalInfo = number[];
}

export const enum ExpressionContext {
  // An `Append` is a single identifier that is contained inside a curly (either in a
  // content curly or an attribute curly)
  AppendSingleId = 0,
  // An `Expression` is evaluated into a value (e.g. `person.name` in `(call person.name)`
  // or `person.name` in `@name={{person.name}}`). This represents a syntactic position
  // that must evaluate as an expression by virtue of its position in the syntax.
  Expression = 1,
  // A `CallHead` is the head of an expression that is definitely a call
  CallHead = 2,
  // A `BlockHead` is the head of an expression that is definitely a block
  BlockHead = 3,
  // A `ModifierHead` is the head of an expression that is definitely a modifir
  ModifierHead = 4,
  // A `ComponentHead` is the head of an expression that is definitely a component
  ComponentHead = 5,
}

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type GetSymbol = [SexpOpcodes.GetSymbol, number];
  export type GetFree = [SexpOpcodes.GetFree, number];
  export type GetFreeInAppendSingleId = [SexpOpcodes.GetFreeInAppendSingleId, number];
  export type GetFreeInExpression = [SexpOpcodes.GetFreeInExpression, number];
  export type GetFreeInCallHead = [SexpOpcodes.GetFreeInCallHead, number];
  export type GetFreeInBlockHead = [SexpOpcodes.GetFreeInBlockHead, number];
  export type GetFreeInModifierHead = [SexpOpcodes.GetFreeInModifierHead, number];
  export type GetFreeInComponentHead = [SexpOpcodes.GetFreeInComponentHead, number];

  export type GetContextualFree =
    | GetFreeInAppendSingleId
    | GetFreeInExpression
    | GetFreeInCallHead
    | GetFreeInBlockHead
    | GetFreeInModifierHead
    | GetFreeInComponentHead;
  export type Get = GetSymbol | GetFree | GetContextualFree;

  export type GetPathSymbol = [SexpOpcodes.GetSymbol, number, Path];
  export type GetPathFree = [SexpOpcodes.GetFree, number, Path];
  export type GetPathFreeInAppendSingleId = [SexpOpcodes.GetFreeInAppendSingleId, number, Path];
  export type GetPathFreeInExpression = [SexpOpcodes.GetFreeInExpression, number, Path];
  export type GetPathFreeInCallHead = [SexpOpcodes.GetFreeInCallHead, number, Path];
  export type GetPathFreeInBlockHead = [SexpOpcodes.GetFreeInBlockHead, number, Path];
  export type GetPathFreeInModifierHead = [SexpOpcodes.GetFreeInModifierHead, number, Path];
  export type GetPathFreeInComponentHead = [SexpOpcodes.GetFreeInComponentHead, number, Path];

  export type GetPathContextualFree =
    | GetPathFreeInAppendSingleId
    | GetPathFreeInExpression
    | GetPathFreeInCallHead
    | GetPathFreeInBlockHead
    | GetPathFreeInModifierHead
    | GetPathFreeInComponentHead;
  export type GetPath = GetPathSymbol | GetPathFree | GetPathContextualFree;

  export type Value = string | number | boolean | null;
  export type Undefined = [SexpOpcodes.Undefined];

  export type TupleExpression =
    | Get
    | GetPath
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined;

  export type Expression = TupleExpression | Value;

  type Recursive<T> = T;

  export interface Concat extends Recursive<[SexpOpcodes.Concat, Core.ConcatParams]> {}
  export interface Helper extends Recursive<[SexpOpcodes.Call, Expression, Option<Params>, Hash]> {}
  export interface HasBlock extends Recursive<[SexpOpcodes.HasBlock, Expression]> {}
  export interface HasBlockParams extends Recursive<[SexpOpcodes.HasBlockParams, Expression]> {}
}

export type Expression = Expressions.Expression;
export type Get = Expressions.Get;

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
  export type Expression = Expressions.Expression;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Blocks = Core.Blocks;
  export type Path = Core.Path;

  export type Append = [SexpOpcodes.Append, Expression];
  export type TrustingAppend = [SexpOpcodes.TrustingAppend, Expression];
  export type Comment = [SexpOpcodes.Comment, string];
  export type Modifier = [SexpOpcodes.Modifier, Expression, Params, Hash];
  export type Block = [SexpOpcodes.Block, Expression, Option<Params>, Hash, Blocks];
  export type Component = [SexpOpcodes.Component, Expression, Attribute[], Hash, Blocks];
  export type OpenElement = [SexpOpcodes.OpenElement, string | WellKnownTagName];
  export type OpenElementWithSplat = [SexpOpcodes.OpenElementWithSplat, string | WellKnownTagName];
  export type FlushElement = [SexpOpcodes.FlushElement];
  export type CloseElement = [SexpOpcodes.CloseElement];
  export type StaticAttr = [SexpOpcodes.StaticAttr, string | WellKnownAttrName, string, string?];
  export type StaticComponentAttr = [
    SexpOpcodes.StaticComponentAttr,
    string | WellKnownAttrName,
    string,
    string?
  ];
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
  export type AttrSplat = [SexpOpcodes.AttrSplat, YieldTo];
  export type Yield = [SexpOpcodes.Yield, YieldTo, Option<Params>];
  export type Partial = [SexpOpcodes.Partial, Expression, Core.EvalInfo];
  export type DynamicArg = [SexpOpcodes.DynamicArg, string, Expression];
  export type StaticArg = [SexpOpcodes.StaticArg, string, Expression];

  export type TrustingAttr = [
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
  export type Debugger = [SexpOpcodes.Debugger, Core.EvalInfo];

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
    | StaticAttr
    | StaticComponentAttr
    | DynamicAttr
    | ComponentAttr
    | AttrSplat
    | Yield
    | Partial
    | StaticArg
    | DynamicArg
    | TrustingAttr
    | TrustingComponentAttr
    | Debugger;

  export type Attribute =
    | Statements.StaticAttr
    | Statements.StaticComponentAttr
    | Statements.DynamicAttr
    | Statements.ComponentAttr
    | Statements.TrustingComponentAttr
    | Statements.Modifier
    | Statements.AttrSplat;

  export type Argument = Statements.StaticArg | Statements.DynamicArg;

  export type Parameter = Attribute | Argument;
}

/** A Handlebars statement */
export type Statement = Statements.Statement;
export type Attribute = Statements.Attribute;
export type Argument = Statements.Argument;
export type Parameter = Statements.Parameter;

export type SexpSyntax = Statement | TupleExpression;
export type Syntax = SexpSyntax | Expressions.Value;

/**
 * A JSON object that the Block was serialized into.
 */
export interface SerializedBlock {
  statements: Statements.Statement[];
}

export interface SerializedInlineBlock extends SerializedBlock {
  parameters: number[];
}

/**
 * A JSON object that the compiled TemplateBlock was serialized into.
 */
export interface SerializedTemplateBlock extends SerializedBlock {
  symbols: string[];
  hasEval: boolean;
  upvars: string[];
}

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
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;
