import { Dict, Option } from '@glimmer/util';
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

  export type Value          = str | number | boolean | null; // tslint:disable-line
  export type HasBlock       = [Opcodes.HasBlock, YieldTo];
  export type HasBlockParams = [Opcodes.HasBlockParams, YieldTo];
  export type Undefined      = [Opcodes.Undefined];
  export type ClientSide     = [Opcodes.ClientSideExpression, any];

  export type Expression =
      Unknown
    | Get
    | MaybeLocal
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined
    | Value
    | ClientSide
    ;

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

  export const isUnknown        = is<Unknown>(Opcodes.Unknown);
  export const isGet            = is<Get>(Opcodes.Get);
  export const isConcat         = is<Concat>(Opcodes.Concat);
  export const isHelper         = is<Helper>(Opcodes.Helper);
  export const isHasBlock       = is<HasBlock>(Opcodes.HasBlock);
  export const isHasBlockParams = is<HasBlockParams>(Opcodes.HasBlockParams);
  export const isUndefined      = is<Undefined>(Opcodes.Undefined);
  export const isClientSide     = is<ClientSide>(Opcodes.ClientSideExpression);
  export const isMaybeLocal     = is<MaybeLocal>(Opcodes.MaybeLocal);

  export function isPrimitiveValue(value: any): value is Value {
    if (value === null) {
      return true;
    }
    return typeof value !== 'object';
  }
}

export type Expression = Expressions.Expression;

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
  export type FlushElement  = [Opcodes.FlushElement];
  export type CloseElement  = [Opcodes.CloseElement];
  export type StaticAttr    = [Opcodes.StaticAttr, str, Expression, Option<str>];
  export type DynamicAttr   = [Opcodes.DynamicAttr, str, Expression, Option<str>];
  export type Yield         = [Opcodes.Yield, YieldTo, Option<Params>];
  export type Partial       = [Opcodes.Partial, Expression, Core.EvalInfo];
  export type DynamicArg    = [Opcodes.DynamicArg, str, Expression];
  export type StaticArg     = [Opcodes.StaticArg, str, Expression];
  export type TrustingAttr  = [Opcodes.TrustingAttr, str, Expression, str];
  export type Debugger      = [Opcodes.Debugger, Core.EvalInfo];
  export type ClientSide    = [Opcodes.ClientSideStatement, any];

  export const isText         = is<Text>(Opcodes.Text);
  export const isAppend       = is<Append>(Opcodes.Append);
  export const isComment      = is<Comment>(Opcodes.Comment);
  export const isModifier     = is<Modifier>(Opcodes.Modifier);
  export const isBlock        = is<Block>(Opcodes.Block);
  export const isComponent    = is<Component>(Opcodes.Component);
  export const isOpenElement  = is<OpenElement>(Opcodes.OpenElement);
  export const isFlushElement = is<FlushElement>(Opcodes.FlushElement);
  export const isCloseElement = is<CloseElement>(Opcodes.CloseElement);
  export const isStaticAttr   = is<StaticAttr>(Opcodes.StaticAttr);
  export const isDynamicAttr  = is<DynamicAttr>(Opcodes.DynamicAttr);
  export const isYield        = is<Yield>(Opcodes.Yield);
  export const isPartial      = is<Partial>(Opcodes.Partial);
  export const isDynamicArg   = is<DynamicArg>(Opcodes.DynamicArg);
  export const isStaticArg    = is<StaticArg>(Opcodes.StaticArg);
  export const isTrustingAttr = is<TrustingAttr>(Opcodes.TrustingAttr);
  export const isDebugger     = is<Debugger>(Opcodes.Debugger);
  export const isClientSide   = is<ClientSide>(Opcodes.ClientSideStatement);

  export type Statement =
      Text
    | Append
    | Comment
    | Modifier
    | Block
    | Component
    | OpenElement
    | FlushElement
    | CloseElement
    | StaticAttr
    | DynamicAttr
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
    ;

  export function isAttribute(val: Statement): val is Attribute {
    return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
  }

  export type Argument =
      Statements.StaticArg
    | Statements.DynamicArg
    ;

  export function isArgument(val: Statement): val is Argument {
    return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
  }

  export type Parameter = Attribute | Argument;

  export function isParameter(val: Statement): val is Parameter {
    return isAttribute(val) || isArgument(val);
  }

  export function getParameterName(s: Parameter): string {
    return s[1];
  }
}

export type Statement = Statements.Statement;

/**
 * A JSON object of static compile time meta for the template.
 */
export interface TemplateMeta {
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
export interface SerializedTemplateWithLazyBlock<T extends TemplateMeta> {
  id?: Option<string>;
  block: SerializedTemplateBlockJSON;
  meta: T;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;
