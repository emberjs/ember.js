import { Dict, Option } from 'glimmer-util';

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
export type YieldTo = str;

export function is<T extends any[]>(variant: string): (value: any[]) => value is T {
  return function(value: any[]): value is T {
    return value[0] === variant;
  };
}

export namespace Core {
  export type Expression = Expressions.Expression;

  export type Path          = str[];
  export type Params        = Expression[];
  export type Hash          = Option<[str[], Expression[]]>;
  export type Args          = [Params, Hash];
}

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type Unknown        = ['unknown', Path];
  export type Arg            = ['arg', Path];
  export type Get            = ['get', Path];
  export type Value          = str | number | boolean | null; // tslint:disable-line
  export type HasBlock       = ['has-block', str];
  export type HasBlockParams = ['has-block-params', str];
  export type Undefined      = ['undefined'];
  export type ClientSide     = ['function', Function];

  export type Expression =
      Unknown
    | Arg
    | Get
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined
    | Value
    | ClientSide
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
  export type Expression = Expressions.Expression;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Path = Core.Path;

  export type Text          = ['text', str];
  export type Append        = ['append', Expression, boolean];
  export type Comment       = ['comment', str];
  export type Modifier      = ['modifier', Path, Params, Hash];
  export type Block         = ['block', Path, Params, Hash, Option<SerializedBlock>, Option<SerializedBlock>];
  export type Component     = ['component', str, SerializedComponent];
  export type OpenElement   = ['open-element', str, str[]];
  export type FlushElement  = ['flush-element'];
  export type CloseElement  = ['close-element'];
  export type StaticAttr    = ['static-attr', str, Expression, Option<str>];
  export type DynamicAttr   = ['dynamic-attr', str, Expression, Option<str>];
  export type Yield         = ['yield', YieldTo, Params];
  export type Partial       = ['partial', Expression];
  export type DynamicArg    = ['dynamic-arg', str, Expression];
  export type StaticArg     = ['static-arg', str, Expression];
  export type TrustingAttr  = ['trusting-attr', str, Expression, str];
  export type Debugger      = ['debugger'];

  export const isText         = is<Text>('text');
  export const isAppend       = is<Append>('append');
  export const isComment      = is<Comment>('comment');
  export const isModifier     = is<Modifier>('modifier');
  export const isBlock        = is<Block>('block');
  export const isComponent    = is<Component>('component');
  export const isOpenElement  = is<OpenElement>('open-element');
  export const isFlushElement = is<FlushElement>('flush-element');
  export const isCloseElement = is<CloseElement>('close-element');
  export const isStaticAttr   = is<StaticAttr>('static-attr');
  export const isDynamicAttr  = is<DynamicAttr>('dynamic-attr');
  export const isYield        = is<Yield>('yield');
  export const isPartial      = is<Partial>('partial');
  export const isDynamicArg   = is<DynamicArg>('dynamic-arg');
  export const isStaticArg    = is<StaticArg>('static-arg');
  export const isTrustingAttr = is<TrustingAttr>('trusting-attr');
  export const isDebugger     = is<Debugger>('debugger');

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
    ;

  export type Attribute =
      Statements.StaticAttr
    | Statements.DynamicAttr
    ;

  export function isAttribute(val: Statement): val is Attribute {
    return val[0] === 'static-attr' || val[0] === 'dynamic-attr';
  }

  export type Argument =
      Statements.StaticArg
    | Statements.DynamicArg
    ;

  export function isArgument(val: Statement): val is Argument {
    return val[0] === 'static-arg' || val[0] === 'dynamic-arg';
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
  locals: string[];
}

export interface SerializedComponent extends SerializedBlock {
  attrs: Statements.Attribute[];
  args: Core.Hash;
}

/**
 * A JSON object that the compiled TemplateBlock was serialized into.
 */
export interface SerializedTemplateBlock extends SerializedBlock {
  named: string[];
  yields: string[];
  hasPartials: boolean;
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
 * @typedef {string} SerializedTemplateBlockJSON
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and TemplateMeta.
 */
export interface SerializedTemplateWithLazyBlock<T extends TemplateMeta> {
  id?: string;
  block: SerializedTemplateBlockJSON;
  meta: T;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 * @typedef {string} TemplateJavascript
 */
export type TemplateJavascript = string;
