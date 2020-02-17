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
  Comment = 2,
  Modifier = 3,
  StrictModifier = 4,
  Block = 5,
  StrictBlock = 6,
  Component = 7,
  OpenElement = 9,
  FlushElement = 10,
  CloseElement = 11,
  StaticAttr = 12,
  DynamicAttr = 13,
  ComponentAttr = 14,
  AttrSplat = 15,
  Yield = 16,
  Partial = 17,

  DynamicArg = 18,
  StaticArg = 19,
  TrustingDynamicAttr = 20,
  TrustingComponentAttr = 21,
  Debugger = 22,
  StaticComponentAttr = 23,

  // Expressions

  GetSymbol = 24,
  GetFree = 25,
  GetContextualFree = 26,
  GetPath = 27,
  HasBlock = 28,
  HasBlockParams = 29,
  Undefined = 30,
  Call = 31,
  Concat = 32,
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
  AppendSingleId = 'AppendSingleId',
  // An `Expression` is evaluated into a value (e.g. `person.name` in `(call person.name)`
  // or `person.name` in `@name={{person.name}}`). This represents a syntactic position
  // that must evaluate as an expression by virtue of its position in the syntax.
  Expression = 'Expression',
  // A `CallHead` is the head of an expression that is definitely a call
  CallHead = 'CallHead',
  // A `BlockHead` is the head of an expression that is definitely a block
  BlockHead = 'BlockHead',
  // A `ModifierHead` is the head of an expression that is definitely a modifir
  ModifierHead = 'ModifierHead',
  // A `ComponentHead` is the head of an expression that is definitely a component
  ComponentHead = 'ComponentHead',
}

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type GetSymbol = [SexpOpcodes.GetSymbol, number];
  export type GetFree = [SexpOpcodes.GetFree, number];
  export type GetContextualFree = [SexpOpcodes.GetContextualFree, number, ExpressionContext];
  export type GetPath = [SexpOpcodes.GetPath, Get, Path];

  export type Value = string | number | boolean | null;
  export type Undefined = [SexpOpcodes.Undefined];

  export type TupleExpression =
    | GetSymbol
    | GetFree
    | GetContextualFree
    | GetPath
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined;

  export type Expression = TupleExpression | Value;
  export type Get = GetSymbol | GetFree | GetContextualFree;

  type Recursive<T> = T;

  export interface Concat extends Recursive<[SexpOpcodes.Concat, Core.ConcatParams]> {}
  export interface Helper
    extends Recursive<[SexpOpcodes.Call, number, number, Expression, Option<Params>, Hash]> {}
  export interface HasBlock extends Recursive<[SexpOpcodes.HasBlock, Expression]> {}
  export interface HasBlockParams extends Recursive<[SexpOpcodes.HasBlockParams, Expression]> {}
}

export type Expression = Expressions.Expression;
export type Get = Expressions.Get;

export type TupleExpression = Expressions.TupleExpression;

export namespace Statements {
  export type Expression = Expressions.Expression;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Blocks = Core.Blocks;
  export type Path = Core.Path;

  // Statement = [op, flags, start, offset, ...args]

  export type Append = [SexpOpcodes.Append, number, number, number, Expression];
  export type Comment = [SexpOpcodes.Comment, string];
  export type Modifier = [SexpOpcodes.Modifier, number, number, Expression, Params, Hash];
  export type Block = [SexpOpcodes.Block, Expression, Option<Params>, Hash, Blocks];
  export type Component = [SexpOpcodes.Component, Expression, Attribute[], Hash, Blocks];
  export type OpenElement = [SexpOpcodes.OpenElement, string, boolean];
  export type FlushElement = [SexpOpcodes.FlushElement];
  export type CloseElement = [SexpOpcodes.CloseElement];
  export type StaticAttr = [SexpOpcodes.StaticAttr, string, string, Option<string>];
  export type StaticComponentAttr = [
    SexpOpcodes.StaticComponentAttr,
    string,
    string,
    Option<string>
  ];
  export type DynamicAttr = [SexpOpcodes.DynamicAttr, string, Expression, Option<string>];
  export type ComponentAttr = [SexpOpcodes.ComponentAttr, string, Expression, Option<string>];
  export type AttrSplat = [SexpOpcodes.AttrSplat, YieldTo];
  export type Yield = [SexpOpcodes.Yield, YieldTo, Option<Params>];
  export type Partial = [SexpOpcodes.Partial, Expression, Core.EvalInfo];
  export type DynamicArg = [SexpOpcodes.DynamicArg, string, Expression];
  export type StaticArg = [SexpOpcodes.StaticArg, string, Expression];
  export type TrustingAttr = [SexpOpcodes.TrustingDynamicAttr, string, Expression, string];
  export type TrustingComponentAttr = [
    SexpOpcodes.TrustingComponentAttr,
    string,
    Expression,
    string
  ];
  export type Debugger = [SexpOpcodes.Debugger, Core.EvalInfo];

  /**
   * A Handlebars statement
   */
  export type Statement =
    | Append
    | Comment
    | Modifier
    | Block
    | Component
    | OpenElement
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
export interface SerializedTemplate<T> {
  block: SerializedTemplateBlock;
  id?: Option<string>;
  meta: T;
}

/**
 * A string of JSON containing a SerializedTemplateBlock
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and TemplateMeta.
 */
export interface SerializedTemplateWithLazyBlock<M> {
  id?: Option<string>;
  block: SerializedTemplateBlockJSON;
  meta: M;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;
