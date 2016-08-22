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
  export type Hash          = [str[], Expression[]];
}

export namespace Expressions {
  type Path = Core.Path;
  type Params = Core.Params;
  type Hash = Core.Hash;

  export type Unknown        = ['unknown', Path];
  export type Arg            = ['arg', Path];
  export type Get            = ['get', Path];
  export type SelfGet        = ['self-get', Path];
  export type Value          = str | number | boolean | null; // tslint:disable-line
  export type HasBlock       = ['has-block', str];
  export type HasBlockParams = ['has-block-params', str];
  export type Undefined      = ['undefined'];

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
  export const isHasBlock       = is<HasBlock>('has-block');
  export const isHasBlockParams = is<HasBlockParams>('has-block-params');
  export const isUndefined      = is<Undefined>('undefined');

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
  export type OpenElement   = ['open-element', str, str[]];
  export type FlushElement  = ['flush-element'];
  export type CloseElement  = ['close-element'];
  export type StaticAttr    = ['static-attr', str, Expression, str];
  export type DynamicAttr   = ['dynamic-attr', str, Expression, str];
  export type Yield         = ['yield', YieldTo, Params];
  export type DynamicArg    = ['dynamic-arg', str, Expression];
  export type StaticArg     = ['static-arg', str, Expression];
  export type TrustingAttr  = ['trusting-attr', str, Expression, str];

  export const isText         = is<Text>('text');
  export const isAppend       = is<Append>('append');
  export const isComment      = is<Comment>('comment');
  export const isModifier     = is<Modifier>('modifier');
  export const isBlock        = is<Block>('block');
  export const isOpenElement  = is<OpenElement>('open-element');
  export const isFlushElement = is<FlushElement>('flush-element');
  export const isCloseElement = is<CloseElement>('close-element');
  export const isStaticAttr   = is<StaticAttr>('static-attr');
  export const isDynamicAttr  = is<DynamicAttr>('dynamic-attr');
  export const isYield        = is<Yield>('yield');
  export const isDynamicArg   = is<DynamicArg>('dynamic-arg');
  export const isStaticArg    = is<StaticArg>('static-arg');
  export const isTrustingAttr = is<TrustingAttr>('trusting-attr');

  export type Statement =
      Text
    | Append
    | Comment
    | Modifier
    | Block
    | OpenElement
    | FlushElement
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
