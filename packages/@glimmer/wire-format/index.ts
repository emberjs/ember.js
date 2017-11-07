import { Dict, Option, Opaque } from '@glimmer/util';
import { Opcodes } from './lib/opcodes';

export { Opcodes as Ops } from './lib/opcodes';

type JsonValue =
    string
  | number
  | boolean
  | JsonObject
  | JsonArray
  ;

interface JsonObject extends Dict<JsonValue> {}
interface JsonArray extends Array<JsonValue> {}

// This entire file is serialized to disk, so all strings
// end up being interned.
export type str = string;
export type TemplateReference = Option<SerializedBlock>;
export type YieldTo = number;

export function is<T>(variant: number): (value: any) => value is T {
  return function(value: any): value is T {
    return Array.isArray(value) && value[0] === variant;
  };
}

export namespace Core {
  export type Expression = Expressions.Expression;

  export type Path          = str[];
  export type Params        = Expression[];
  export type Hash          = Option<[str[], Expression[]]>;
  export type Args          = [Params, Hash];
  export type EvalInfo      = number[];
}

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type Unknown        = [Opcodes.Unknown, str];
  export type Get            = [Opcodes.Get, number, Path];

  /**
   * Ambiguous between a self lookup (when not inside an eval) and
   * a local variable (when used inside of an eval).
   */
  export type MaybeLocal     = [Opcodes.MaybeLocal, Path];

  export type Value          = str | number | boolean | null;

  export type HasBlock       = [Opcodes.HasBlock, YieldTo];
  export type HasBlockParams = [Opcodes.HasBlockParams, YieldTo];
  export type Undefined      = [Opcodes.Undefined];
  export type ClientSide     = [Opcodes.ClientSideExpression, any];

  export type TupleExpression =
    Unknown
    | Get
    | MaybeLocal
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined
    | ClientSide
    ;

  export type Expression = TupleExpression | Value;

  export interface Concat extends Array<any> {
    [0]: Opcodes.Concat;
    [1]: Params;
  }

  export interface Helper extends Array<any> {
    [0]: Opcodes.Helper;
    [1]: str;
    [2]: Params;
    [3]: Hash;
  }
}

export type Expression = Expressions.Expression;

export type TupleExpression = Expressions.TupleExpression;

export namespace Statements {
  export type Expression = Expressions.Expression;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Path = Core.Path;

  export type Text          = [Opcodes.Text, str];
  export type Append        = [Opcodes.Append, Expression, boolean];
  export type Comment       = [Opcodes.Comment, str];
  export type Modifier      = [Opcodes.Modifier, str, Params, Hash];
  export type Block         = [Opcodes.Block, str, Params, Hash, Option<SerializedInlineBlock>, Option<SerializedInlineBlock>];
  export type Component     = [Opcodes.Component, str, Attribute[], Hash, Option<SerializedInlineBlock>];
  export type OpenElement   = [Opcodes.OpenElement, str];
  export type SplatElement  = [Opcodes.OpenSplattedElement, str];
  export type FlushElement  = [Opcodes.FlushElement];
  export type CloseElement  = [Opcodes.CloseElement];
  export type StaticAttr    = [Opcodes.StaticAttr, str, Expression, Option<str>];
  export type DynamicAttr   = [Opcodes.DynamicAttr, str, Expression, Option<str>];
  export type AttrSplat     = [Opcodes.AttrSplat, YieldTo];
  export type Yield         = [Opcodes.Yield, YieldTo, Option<Params>];
  export type Partial       = [Opcodes.Partial, Expression, Core.EvalInfo];
  export type DynamicArg    = [Opcodes.DynamicArg, str, Expression];
  export type StaticArg     = [Opcodes.StaticArg, str, Expression];
  export type TrustingAttr  = [Opcodes.TrustingAttr, str, Expression, str];
  export type Debugger      = [Opcodes.Debugger, Core.EvalInfo];
  export type ClientSide    = [Opcodes.ClientSideStatement, any];

  export type Statement =
      Text
    | Append
    | Comment
    | Modifier
    | Block
    | Component
    | OpenElement
    | SplatElement
    | FlushElement
    | CloseElement
    | StaticAttr
    | DynamicAttr
    | AttrSplat
    | Yield
    | Partial
    | StaticArg
    | DynamicArg
    | TrustingAttr
    | Debugger
    | ClientSide
    ;

  export type Attribute =
      Statements.StaticAttr
    | Statements.DynamicAttr
    | Statements.AttrSplat
    ;

  export type Argument =
      Statements.StaticArg
    | Statements.DynamicArg
    ;

  export type Parameter = Attribute | Argument;
}

export type Statement = Statements.Statement;

/**
 * A JSON object of static compile time meta for the template.
 */
export interface TemplateMeta {
  [key: string]: Opaque;
  moduleName?: string;
}

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
}

/**
 * A JSON object that the compiled Template was serialized into.
 */
export interface SerializedTemplate<T extends TemplateMeta> {
  block: SerializedTemplateBlock;
  meta: T;
}

/**
 * A string of JSON containing a SerializedTemplateBlock
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and TemplateMeta.
 */
export interface SerializedTemplateWithLazyBlock<TemplateMeta> {
  id?: Option<string>;
  block: SerializedTemplateBlockJSON;
  meta: TemplateMeta;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;

// Statements
export const isModifier       = is<Statements.Modifier>(Opcodes.Modifier);
export const isFlushElement   = is<Statements.FlushElement>(Opcodes.FlushElement);

export function isAttribute(val: Statement): val is Statements.Attribute {
  return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
}

export function isArgument(val: Statement): val is Statements.Argument {
  return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
}

// Expressions
export const isGet            = is<Expressions.Get>(Opcodes.Get);
export const isMaybeLocal     = is<Expressions.MaybeLocal>(Opcodes.MaybeLocal);
