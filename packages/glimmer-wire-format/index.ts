import { Dict } from 'glimmer-util';

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
export type TemplateReference = number;
export type YieldTo = str;

function is<T extends any[]>(variant: string): (value: any[]) => value is T {
  return function(value: any[]): value is T {
    return value[0] === variant;
  };
}

export namespace Core {
  type Expression = Expressions.Expression;

  export type Path          = str[];
  export type Params        = Expression[];
  export type Hash          = Dict<Expression>;
}

export namespace Expressions {
  type Path = Core.Path;
  type Params = Core.Params;
  type Hash = Core.Hash;

  type UndefinedStringLiteral = 'undefined';
  type UndefinedLiteral = ['undefinedLiteral', 'undefined'];

  export type Unknown        = ['unknown', Path];
  export type Arg            = ['arg', Path];
  export type Get            = ['get', Path];
  export type SelfGet        = ['self-get', Path];
  export type Value          = str | number | boolean | null; // tslint:disable-line
  export type HasBlock       = ['hasBlock', str];
  export type HasBlockParams = ['hasBlockParams', str];
  export type Undefined      = UndefinedStringLiteral | UndefinedLiteral;

  export type Expression =
      Unknown
    | Arg
    | Get
    | SelfGet
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined
    | Value
    ;

  export interface Concat extends Array<any> {
    [0]: 'concat';
    [1]: Params;
  }

  export interface Helper extends Array<any> {
    [0]: 'helper';
    [1]: Path;
    [2]: Params;
    [3]: Hash;
  }

  export const isUnknown        = is<Unknown>('unknown');
  export const isArg            = is<Arg>('arg');
  export const isGet            = is<Get>('get');
  export const isSelfGet        = is<SelfGet>('self-get');
  export const isConcat         = is<Concat>('concat');
  export const isHelper         = is<Helper>('helper');
  export const isHasBlock       = is<HasBlock>('hasBlock');
  export const isHasBlockParams = is<HasBlockParams>('hasBlockParams');

  export function isUndefined(value: any): value is Undefined {
    if (typeof value === 'object' && value !== null && value[0] === 'undefinedLiteral') {
      return true;
    }

    return false;
  }

  export function isPrimitiveValue(value: any): value is Value {
    if (value === null) {
      return true;
    }
    return typeof value !== 'object';
  }
}

export type Expression = Expressions.Expression;

export namespace Statements {
  type Expression = Expressions.Expression;
  type Params = Core.Params;
  type Hash = Core.Hash;
  type Path = Core.Path;

  export type Text          = ['text', str];
  export type Append        = ['append', Expression, boolean];
  export type Comment       = ['comment', str];
  export type Modifier      = ['modifier', Path, Params, Hash];
  export type Block         = ['block', Path, Params, Hash, TemplateReference, TemplateReference];
  export type OpenElement   = ['openElement', str, str[]];
  export type CloseElement  = ['closeElement'];
  export type StaticAttr    = ['staticAttr', str, Expression, str];
  export type DynamicAttr   = ['dynamicAttr', str, Expression, str];
  export type Yield         = ['yield', YieldTo, Params];
  export type DynamicArg    = ['dynamicArg', str, Expression];
  export type StaticArg     = ['staticArg', str, Expression];
  export type TrustingAttr  = ['trustingAttr', str, Expression, str];

  export const isText         = is<Text>('text');
  export const isAppend       = is<Append>('append');
  export const isComment      = is<Comment>('comment');
  export const isModifier     = is<Modifier>('modifier');
  export const isBlock        = is<Block>('block');
  export const isOpenElement  = is<OpenElement>('openElement');
  export const isCloseElement = is<CloseElement>('closeElement');
  export const isStaticAttr   = is<StaticAttr>('staticAttr');
  export const isDynamicAttr  = is<DynamicAttr>('dynamicAttr');
  export const isYield        = is<Yield>('yield');
  export const isDynamicArg   = is<DynamicArg>('dynamicArg');
  export const isStaticArg    = is<StaticArg>('staticArg');
  export const isTrustingAttr = is<TrustingAttr>('trustingAttr');

  export type Statement =
      Text
    | Append
    | Comment
    | Modifier
    | Block
    | OpenElement
    | CloseElement
    | StaticAttr
    | DynamicAttr
    | Yield
    | StaticArg
    | DynamicArg
    | TrustingAttr
    ;
}

export type Statement = Statements.Statement;

export interface BlockMeta {
  moduleName?: string;
}

export interface SerializedTemplate {
  statements: Statements.Statement[];
  locals: string[];
  named: string[];
  yields: string[];
  blocks: SerializedBlock[];
  meta: BlockMeta;
}

export interface SerializedBlock {
  statements: Statements.Statement[];
  locals: string[];
}
